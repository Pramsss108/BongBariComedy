const fs = require('fs');
let file = fs.readFileSync('server/routes/downloader.ts', 'utf8');

// Patch 1: handleProxyStream
let oldProxy = `async function handleProxyStream(req: Request, res: Response): Promise<void> {
  const validated = validateVideoUrl(req.query.url as string);
  if (!validated.ok) {
    res.status(400).json({ error: validated.error });
    return;
  }

  try {
    const ytArgs = [
      "--get-url",
      "--no-warnings",
      "--no-check-certificate",
      "--extractor-args", "youtube:player_client=android,ios",
      "--format", "best[height<=480][ext=mp4]/best[height<=480]/best"
    ];

    const directUrlOutput = await new Promise<string>((resolve, reject) => {
      execFile(YT_DLP_PATH, [...ytArgs, validated.url], { maxBuffer: 1024 * 1024 * 5 }, (error, stdout) => {
        if (error) return reject(error);
        resolve(stdout.trim());
      });
    });

    const urls = directUrlOutput.split("\\n").map((u: string) => u.trim()).filter(Boolean);
    const streamUrl = urls[0];
    if (!streamUrl) throw new Error("No stream URL found");

    // Return the URL to the frontend — browser <video> will play it directly
    res.json({ streamUrl });
  } catch (err: any) {
    console.error("[downloader/proxy-stream] error:", err?.message);
    formatNotAvailable(
      res,
      "Preview unavailable for this video. You can still download it directly.",
    );
  }
}`;

let newProxy = `async function handleProxyStream(req: Request, res: Response): Promise<void> {
  const validated = validateVideoUrl(req.query.url as string);
  if (!validated.ok) {
    res.status(400).json({ error: validated.error });
    return;
  }

  try {
    console.log("[Phase 1] Offloading Proxy Stream to Hetzner VPS");
    const fetch = (await import("node-fetch")).default;
    const response = await fetch("http://78.47.104.43:9000/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: validated.url })
    });
    if (!response.ok) throw new Error("Engine API error");
    const data = await response.json() as { url?: string };
    if (!data.url) throw new Error("No URL in API response");
    res.json({ streamUrl: data.url });
  } catch (err: any) {
    console.error("[downloader/proxy-stream] error:", err?.message);
    formatNotAvailable(res, "Preview unavailable. Engine optimization in progress.");
  }
}`;

// Patch 2: handleStream bypass
let streamInsertLoc = `  const format = (req.query.format as string) ?? "mp4-720";
  const mode = (req.query.mode as string) ?? "download"; // 'download' | 'preview'

  // Phase 14: Global Concurrency Guard`;

let newStreamCode = `  const format = (req.query.format as string) ?? "mp4-720";
  const mode = (req.query.mode as string) ?? "download"; // 'download' | 'preview'

  // [PHASE 1] The Render Decoupling: Zero-Bandwidth Bypass for full videos and previews
  if (startSec === null) {
      console.log(\`[Phase 1] 🚀 Bypass Render -> Redirecting stream directly to Client via Hetzner Engine...\`);
      try {
          const fetch = (await import("node-fetch")).default;
          // Use the Hetzner remote API to get a pure stateless stream URL bypassing our bandwidth
          const isAudioOnly = format.includes("m4a") || format.includes("mp3");
          const engineRes = await fetch("http://78.47.104.43:9000/", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ url: validated.url, isAudioOnly: isAudioOnly })
          });
          
          if (engineRes.ok) {
              const data = await engineRes.json() as any;
              if (data.url) {
                  console.log(\`[Phase 1] ✅ Direct CDN bypass successful! Redirecting player to: \${data.url.substring(0, 50)}...\`);
                  res.redirect(data.url);
                  return; // End request here, saving Render completely
              }
          }
      } catch (err) {
          console.warn("[Phase 1] ⚠️ Engine unreachable, falling back to local piping (will burn CPU)", err);
      }
  }

  // Phase 14: Global Concurrency Guard`;

// Patch 3: fetchSmartMetadata
let oldMeta = `async function fetchSmartMetadata(url: string): Promise<any> {
    // Strategy: Try Local yt-dlp first for quality (thumbnails etc),
    // fallback to Cobalt if blocked/failed.
    // NOTE: Plan V2 says "Cobalt Primary" but for *Metadata*, local yt-dlp is superior
    // because Cobalt missing thumbnails breaks the UI preview.
    // We will use Local Primary for INFO, but Cobalt Primary for DOWNLOAD (in handleStream logic).

    try {
        // 1. Try Local yt-dlp (High Fidelity)
        const isYT = url.includes("youtube.com") || url.includes("youtu.be");
        let extraArgs: string[] = ["--extractor-args", "youtube:player_client=android,ios"];

        if (isYT) {
            try {
                const { visitorData, poToken } = await getPoToken();
                extraArgs = ["--extractor-args", \`youtube:player_client=android,ios;po_token=web+\${poToken};visitor_data=\${visitorData}\`];
            } catch (poErr) {
                console.warn("[PoToken] Failed to fetch po_token for metadata, falling back to standard extraction", poErr);
            }
        }

        const info = await executeYtDlp(url, [
            "--dump-single-json",
            "--no-warnings",
            "--no-call-home",
            "--prefer-free-formats",
            "--youtube-skip-dash-manifest",
            ...extraArgs,
             "--format", "bestvideo[height<=1080]+bestaudio/best[height<=1080]/best"
        ]);
        return info;
    } catch (localErr) {
        console.warn(\`[SmartMetadata] Local fetch failed, trying Cobalt...\`, localErr);
        // 2. Fallback to Cobalt (Low Fidelity / Savior)
        try {
            return await fetchMetadataCobalt(url);
        } catch (cobaltErr) {
            throw new Error(\`Both engines failed. Local: \${localErr}. Cobalt: \${cobaltErr}\`);
        }
    }
}`;

let newMeta = `async function fetchSmartMetadata(url: string): Promise<any> {
    console.log(\`[Phase 2] Requesting fast metadata proxy from Hetzner for: \${url}\`);
    try {
        const fetch = (await import("node-fetch")).default;
        const response = await fetch("http://78.47.104.43:9000/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: url })
        });
        if (response.ok) {
            const data = await response.json() as any;
            if (data.title || data.duration) {
                return {
                    title: data.title || "Video",
                    duration: data.duration || 0,
                    thumbnail: data.thumbnail || null,
                    formats: [] // Trigger lightning fast fallback
                };
            }
        }
        throw new Error("Hetzner returned ok but missing metadata fields.");
    } catch (engineErr) {
        console.warn(\`[Phase 2] Engine fetch failed, falling back to Cobalt...\`, engineErr);
        try {
            return await fetchMetadataCobalt(url);
        } catch (cobaltErr) {
            throw new Error(\`Both engines failed. Engine: \${engineErr}. Cobalt: \${cobaltErr}\`);
        }
    }
}`;

file = file.replace(oldProxy, newProxy);
file = file.replace(streamInsertLoc, newStreamCode);
file = file.replace(oldMeta, newMeta);

fs.writeFileSync('server/routes/downloader.ts', file);
console.log('Script completed');
