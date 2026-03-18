const fs = require('fs');
let content = fs.readFileSync('server/routes/downloader.ts', 'utf8');

// 1. Remove fetchMetadataCobalt and rewrite fetchSmartMetadata
const metadataRegex = /\/\/ ---------------------------------------------------------------------------\s*\n\/\/ HYBRID METADATA ENGINE[\s\S]*?async function handleInfo/m;
const newMetadata = `// ---------------------------------------------------------------------------
// HYBRID METADATA ENGINE (ASocks Proxy -> Local Fallback)
// Phase 0: Stealth Metadata Extraction via PAYG SOCKS5 Proxy
// ---------------------------------------------------------------------------

async function executeYtDlpExtract(url: string, extraArgs: string[] = []): Promise<any> {
    const ytArgs = [
        "--dump-json",
        "--no-warnings",
        "--no-call-home",
        "--geo-bypass", 
        ...extraArgs
    ];
    
    // Fallback to strict env if undefined
    const proxy = process.env.ASOCKS_PROXY || "http://q0b2vvoyfp-res-country-IN-hold-session-session-69badf0c52b0a:MsuSXbhmwtpdr81t@93.190.141.57:443";
    
    try {
        const proxyArgs = [...ytArgs, "--proxy", proxy];
        console.log(\`[Phase 0] Executing yt-dlp via ASocks Proxy...\`);
        return await executeYtDlp(url, proxyArgs);
    } catch (proxyErr: any) {
        console.warn(\`[Phase 0] ASocks proxy failed! Falling back to DIRECT yt-dlp...\`, proxyErr.message || proxyErr);
        console.log(\`[Phase 0] Executing yt-dlp directly without proxy (Hetzner Node)...\`);
        return await executeYtDlp(url, ytArgs);
    }
}

async function fetchSmartMetadata(url: string): Promise<any> {
    if (metaCache.has(url)) {
        const cached = metaCache.get(url)!;
        if (cached.expires > Date.now()) {
            console.log(\`[Cache ⚡] Instant Metadata HIT for \${url}\`);
            return cached.data;
        }
    }

    console.log(\`[Phase 0] Requesting metadata using Hybrid Engine for: \${url}\`);
    const fetchStart = performance.now();
    try {
        const data = await executeYtDlpExtract(url);
        console.log(\`[Trace ⏱️] Hybrid Engine Responded in \${Math.round(performance.now() - fetchStart)}ms\`);

        const result = {
            title: data.title || "Video",
            duration: data.duration || 0,
            thumbnail: data.thumbnail || null,
            formats: data.formats || [], 
        };
        metaCache.set(url, { data: result, expires: Date.now() + CACHE_TTL_MS });
        return result;
    } catch (engineErr: any) {
        console.error(\`[Phase 0] Total Metadata Failure:\`, engineErr?.message || engineErr);
        throw new Error(\`Total engine failure: \${engineErr.message}\`);
    }
}

// ---------------------------------------------------------------------------
// PHRASE 2: GET /api/downloader/info
// Returns video metadata: title, thumbnail, duration, available formats
// ---------------------------------------------------------------------------
async function handleInfo`;

content = content.replace(metadataRegex, newMetadata);

// 2. Rewrite handleProxyStream
const proxyStreamRegex = /async function handleProxyStream[\s\S]*?\}\n\n    \/\/ ---/m;

const newProxyStream = `async function handleProxyStream(req: Request, res: Response): Promise<void> {
  const validated = validateVideoUrl(req.query.url as string);
  const requestedFormat = (req.query.format as string) || "mp4-480";
  const qualityMatch = requestedFormat.match(/\\d{3,4}/);
  const qStr = qualityMatch ? qualityMatch[0] : "480";

  if (!validated.ok) {
    res.status(400).json({ error: validated.error });
    return;
  }

  const { url } = validated;

  if (streamCache.has(url)) {
      const cached = streamCache.get(url)!;
      if (cached.expires > Date.now()) {
          console.log(\`[Cache ⚡] Instant PREVIEW HIT for \${url} at \${qStr}p\`);
          res.json({ streamUrl: cached.url });
          return;
      }
  }

  console.log(\`[Phase 0] Requesting fast PREVIEW CDN extract for: \${url}\`);
  const fetchStart = performance.now();
  try {
      const data = await executeYtDlpExtract(url, ["--format", \`best[height<=\${qStr}][ext=mp4]/best[height<=\${qStr}]/best\`]);
      console.log(\`[Trace ⏱️] Engine PREVIEW Responded in \${Math.round(performance.now() - fetchStart)}ms\`);
      
      const streamUrl = data.url || (data.requested_downloads && data.requested_downloads[0].url);
      
      if (streamUrl) {
          streamCache.set(url, { url: streamUrl, expires: Date.now() + CACHE_TTL_MS });
          res.json({ streamUrl });
          return;
      }
      throw new Error("yt-dlp returned ok but missing stream CDN URL.");
  } catch (err: any) {
      console.error("[downloader/proxy-stream] error:", err?.message);
      formatNotAvailable(res, "Preview unavailable for this video. You can still download it directly.");
  }
}

// ---`;

content = content.replace(proxyStreamRegex, newProxyStream);

// 3. Rewrite Phase 3 Full Video bypass in handleStream
const fullStreamRegex = /console\.log\(\`\\n\\n🟢 \[VIBE CODER ALERT\] 👉 FULL VIDEO STREAM INITIATED!\`\);[\s\S]*?console\.log\(\`\[Phase 3\] FULL VIDEO OR PREVIEW -> Fetching raw CDN URL from proxy for bypass!\`\);[\s\S]*?\/\/ FINAL FALLBACK: PIPE YT-DLP DIRECTLY/m;

const newFullStream = `console.log(\`\\n\\n🟢 [VIBE CODER ALERT] 👉 FULL STREAM INITIATED!\`);
          console.log(\`[Phase 0] Redirecting to direct CDN URL if possible...\`);
          
          try {
              // Try to get raw CDN URL directly via proxy bypass to save Hetzner bandwidth
              const data = await executeYtDlpExtract(validated.url, ["--format", chosen.ytFormat]);
              const rawCdnUrl = data.url || (data.requested_downloads && data.requested_downloads[0].url);
              
              if (rawCdnUrl) {
                  console.log(\`✅ [SUCCESS] Fast-pathing Full Video -> Redirecting client directly to Google CDN!\`);
                  res.redirect(302, rawCdnUrl);
                  return;
              }
          } catch(cdnErr: any) {
              console.warn(\`[Phase 0] Direct CDN extraction failed (\${cdnErr.message}). Streaming via local pipe...\`);
          }

          // FINAL FALLBACK: PIPE YT-DLP DIRECTLY`;

content = content.replace(fullStreamRegex, newFullStream);

// Remove the getNextPreviewNode and PREVIEW_NODES array since we aren't using Hetzner routing
const previewNodesRegex = /\/\/ ---------------------------------------------------------------------------\s*\n\/\/ PREVIEW NODES[\s\S]*?function getNextPreviewNode\(\)[\s\S]*?\}\n/m;
content = content.replace(previewNodesRegex, "");

fs.writeFileSync('server/routes/downloader.ts', content);
console.log("Patched downloader.ts with Phase 0 proxy architecture successfully.");
