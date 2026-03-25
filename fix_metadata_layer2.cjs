const fs = require('fs');
const content = fs.readFileSync('server/routes/downloader.ts', 'utf8');

const target = `    // 2. FALLBACK PATH: yt-dlp extract via Proxy / Render
    if (!forceEngine || forceEngine === "layer4" || forceEngine === "layer3") {`;

const payload = `    // 1.5. LAYER 2 OVERRIDE (Cloudflare Edge Swarm - Meta only)
    if (forceEngine === "layer2") {
        console.log(\`[Layer 2 Metadata Bypass] Booting Cloudflare Edge Swarm for info...\`);
        try {
            const isMeta = url.includes("instagram.com") || url.includes("facebook.com") || url.includes("fb.watch") || url.includes("instagr.am");
            if (!isMeta) throw new Error("Layer 2 (Edge Swarm) only supports Meta/Instagram links.");
            
            const swarmUrl = "https://ancient-king-7fa9.guitarguitarabhijit.workers.dev/?url=" + encodeURIComponent(url);
            const swarmRes = await require('axios').get(swarmUrl, { timeout: 15000 });
            const body = typeof swarmRes.data === 'string' ? swarmRes.data : JSON.stringify(swarmRes.data);
            
            // Just check if we get a hit to construct dummy metadata
            let match = body.match(/"video_url":"([^"]+)"/) || 
                        body.match(/<meta property="og:video" content="([^"]+)"/) ||
                        body.match(/playable_url_quality_hd/: "([^"]+)"/);
                        
            if (!match) throw new Error("No video stream found in Swarm payload");
            
            const result = {
                engine: "Layer 2 (Free Meta Edge Swarm)",
                title: "Instagram/Meta Video",
                duration: 0,
                thumbnail: null,
                formats: [
                    { ext: "mp4", height: 720, url: match[1].replace(/\\\\/g, ''), id: "mp4-720", label: "MP4 720p" }
                ],
                previewUrl: match[1].replace(/\\\\/g, '')
            };
            metaCache.set(url, { data: result, expires: Date.now() + 60000 });
            return result;
        } catch (e) {
            console.error(\`[Layer 2] Swarm Fetch Info Failed:\`, e.message);
            throw new Error(\`Layer 2 Swarm Extraction Failed: \${e.message}\`);
        }
    }

    // 2. FALLBACK PATH: yt-dlp extract via Proxy / Render
    if (!forceEngine || forceEngine === "layer4" || forceEngine === "layer3") {`;

const updated = content.replace(target, payload);
if (updated !== content) {
    fs.writeFileSync('server/routes/downloader.ts', updated);
    console.log("Successfully injected layer2 into fetchSmartMetadata.");
} else {
    console.log("Failed to find target");
}