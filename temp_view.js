async function handleProxyStream(req: Request, res: Response): Promise<void> {
  const validated = validateVideoUrl(req.query.url as string);
  const requestedFormat = (req.query.format as string) || "mp4-480";
  // Extract quality '480' from 'mp4-480'
  const qualityMatch = requestedFormat.match(/\d{3,4}/);
  const qStr = qualityMatch ? parseInt(qualityMatch[0]) : 480;

  if (!validated.ok) {
    res.status(400).json({ error: validated.error });
    return;
  }

  const { url } = validated;
    
  // 1. FAST PATH: Check RAM Cache for existing direct URL
  if (streamCache.has(url)) {
      const cached = streamCache.get(url)!;
      if (cached.expires > Date.now()) {
          console.log(`[Cache ⚡] Instant PREVIEW URL HIT for ${url} at ${qStr}p`);
          res.json({ streamUrl: cached.url });
          return;
      }
  }

  // 2. ULTRA SMART PATH (Phase 0 Fast Cache Sharing): 
  // If we just fetched /info recently, metaCache ALREADY has the raw CDN URLs for every format!
  // We don't need to boot up yt-dlp through a proxy again (saves 4 seconds)!
  if (metaCache.has(url)) {
      const cached = metaCache.get(url)!;
      if (cached.expires > Date.now() && cached.data.formats && Array.isArray(cached.data.formats)) {
          console.log(`[Phase 0 Smart] 🧠 Zero-latency preview bypass using existing metaCache data for ${url}`);
          
          const rawFormats = cached.data.formats;
          let bestStreamUrl = null;
          
          // Look for best mp4 video+audio combo matching requested quality
          for (const f of rawFormats) {
              if (f.ext === 'mp4' && f.acodec !== 'none' && f.vcodec !== 'none' && f.height && f.height <= qStr) {
                  if (f.url) { 
                      bestStreamUrl = f.url; 
                      console.log(`[Phase 0 Smart] Found pre-muxed mp4 at ${f.height}p in cache!`);
                      break; 
                  }
              }
          }
          
          // Fallback: any video format <= qStr
          if (!bestStreamUrl) {
              for (const f of rawFormats) {
                   if (f.height && f.height <= qStr && f.url) {
                        bestStreamUrl = f.url;
                        break;
                   }
              }
          }

          if (bestStreamUrl) {
              streamCache.set(url, { url: bestStreamUrl, expires: Date.now() + CACHE_TTL_MS });
              res.json({ streamUrl: bestStreamUrl });
              return;
          }
      }
  }

  // 3. Fallback: If cache completely misses (deep link proxy request), fetch it via proxy
  console.log(`[Phase 0] Requesting fast PREVIEW proxy extraction for: ${url}`);
  const fetchStart = performance.now();
  
  try {
      // Force fastest pre-muxed extraction
      const data = await executeYtDlpExtract(url, ["--format", `best[height<=${qStr}][ext=mp4]/best[height<=${qStr}]/best`]);
      console.log(`[Trace ⏱️] ASocks PREVIEW Engine Responded in ${Math.round(performance.now() - fetchStart)}ms`);
      
      const streamUrl = data.url || (data.requested_downloads && data.requested_downloads[0]?.url);
      
      if (streamUrl) {
          streamCache.set(url, { url: streamUrl, expires: Date.now() + CACHE_TTL_MS });
          res.json({ streamUrl });
          return;
      }
      throw new Error("Proxy engine returned success but missing CDN URL.");
      
  } catch (err: any) {
      console.error("[downloader/proxy-stream] error:", err?.message || err);
      // Ensure we don't crash
      formatNotAvailable(res, "Preview streaming unavailable right now. Try downloading directly.");
  }
}
  