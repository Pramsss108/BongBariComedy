const fs = require('fs');

const file = 'server/routes/downloader.ts';
let code = fs.readFileSync(file, 'utf8');

// We will inject clean standalone phase functions at the top of the file
const injections = `
// ==========================================
// 8-PHASE ARCHITECTURE: STANDALONE ENGINES
// ==========================================

async function executePhase1_HetznerCobalt(url: string): Promise<any> {
    console.log('[Phase 1] Executing Hetzner Cobalt for:', url);
    const HETZNER_URL = process.env.HETZNER_COBALT_URL || 'http://hel1.r.y0n.de:9000';
    
    // Anti-burst: slight human-like initial delay
    const initialJitter = Math.floor(Math.random() * 200) + 100;
    await new Promise(resolve => setTimeout(resolve, initialJitter));
    
    const axios = require('axios');
    const response = await axios.post(
      HETZNER_URL,
      {
        url: url,
        aFormat: "best",
        vQuality: "1080",
        isAudioOnly: false,
        isTTfullAudio: true,
        isAudioMuted: false,
        dubLang: false,
        disableMetadata: false,
        twitterGif: false,
        vimeoGif: false
      },
      {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 15000
      }
    );

    if (response.data && response.data.status === 'stream' && response.data.url) {
      return {
          engineUsed: 'Force Layer 1: Cobalt API (Working/Free/YT)',
          video_url: response.data.url,
          title: response.data.title || "Hetzner Video",
          duration: 0,
          thumbnail: null,
          formats: [
              {
                  ext: "mp4",
                  height: 720,
                  url: response.data.url,
                  id: "mp4-720",
                  label: "MP4 720p"
              }
          ]
      };
    }
    
    if (response.data && response.data.picker && response.data.picker[0]?.url) {
        return {
            engineUsed: 'Force Layer 1: Cobalt API (Working/Free/YT)',
            video_url: response.data.picker[0].url,
            title: response.data.title || "Hetzner Picker Video",
            duration: 0,
            thumbnail: response.data.picker[0].thumb || null,
            formats: [
                {
                    ext: "mp4",
                    height: 720,
                    url: response.data.picker[0].url,
                    id: "mp4-720",
                    label: "MP4 720p"
                }
            ]
        };
    }
    
    throw new Error('Phase 1: Invalid response format from Hetzner Cobalt.');
}

async function executePhase2_CFSwarm(url: string): Promise<any> {
    console.log('[Phase 2] Executing CF Swarm Edge for:', url);
    const isMeta = url.includes("instagram.com") || url.includes("facebook.com") || url.includes("fb.watch") || url.includes("instagr.am") || url.includes("instagr.com");
    if (!isMeta) throw new Error("Layer 2 (Edge Swarm) only supports Meta/Instagram links.");
    
    const swarmUrl = "https://ancient-king-7fa9.guitarguitarabhijit.workers.dev/?url=" + encodeURIComponent(url);
    const axios = require('axios');
    const swarmRes = await axios.get(swarmUrl, { timeout: 15000 });
    
    const body = typeof swarmRes.data === 'string' ? swarmRes.data : JSON.stringify(swarmRes.data);
    let match = body.match(/"video_url":"([^"]+)"/) ||
                body.match(/<meta property="og:video" content="([^"]+)"/) ||
                body.match(/"playable_url_quality_hd":"([^"]+)"/);

    if (!match) {
        throw new Error("Phase 2: No video stream found in Swarm payload.");
    }
    
    const finalUrl = match[1].replace(/\\\\/g, '').replace(/&amp;/g, '&');
    return {
        engineUsed: 'Force Layer 2: CF Swarm Edge (Testing/Free/IG-FB)',
        video_url: finalUrl,
        title: "Instagram/Meta Video",
        duration: 0,
        thumbnail: null,
        formats: [
            {
                ext: "mp4",
                height: 720,
                url: finalUrl,
                id: "mp4-720",
                label: "MP4 720p"
            }
        ]
    };
}
`;

// Insert the functions right after `// Cache Setup` or somewhere safe at top
if (!code.includes('executePhase1_HetznerCobalt')) {
    const importIdx = code.indexOf('import ');
    const firstFuncIdx = code.indexOf('function ', importIdx + 100);
    code = code.substring(0, firstFuncIdx) + injections + '\n' + code.substring(firstFuncIdx);
}

// Now replace fetchSmartMetadata
const startMeta = code.indexOf('async function fetchSmartMetadata');
const endMeta = code.indexOf('// PHASE : GET /api/downloader/info');
if (startMeta !== -1 && endMeta !== -1) {
    const newFetchMeta = `async function fetchSmartMetadata(url: string, forceEngine?: string): Promise<any> {
    if (!forceEngine && metaCache.has(url)) {
        const cached = metaCache.get(url)!;
        if (cached.expires > Date.now()) {
            console.log(\`[Cache ⚡] Instant Metadata HIT for \${url}\`);
            return cached.data;
        }
    }

    console.log(\`[Phase 0] Requesting metadata. Engine mode: \${forceEngine || 'Smart Auto-Fallback'} | URL: \${url}\`);

    // ==========================================
    // STRICT FORCE MODE (NO FALLBACKS)
    // ==========================================
    
    if (forceEngine === "layer1") {
        const result = await executePhase1_HetznerCobalt(url);
        metaCache.set(url, { data: result, expires: Date.now() + CACHE_TTL_MS });
        return result; // Crates if fails, NO fallback
    }
    
    if (forceEngine === "layer2") {
        const result = await executePhase2_CFSwarm(url);
        metaCache.set(url, { data: result, expires: Date.now() + 60000 });
        return result; // Creates if fails, NO fallback
    }

    // ==========================================
    // SMART AUTO-FALLBACK CASCADE
    // ==========================================
    if (!forceEngine || forceEngine === "auto") {
        try {
            const res1 = await executePhase1_HetznerCobalt(url);
            metaCache.set(url, { data: res1, expires: Date.now() + CACHE_TTL_MS });
            return res1;
        } catch (e1: any) {
            console.log(\`[Smart Fallback] Phase 1 failed (\${e1.message}), cascading to Phase 2...\`);
            try {
                const res2 = await executePhase2_CFSwarm(url);
                metaCache.set(url, { data: res2, expires: Date.now() + 60000 });
                return res2;
            } catch (e2: any) {
                console.log(\`[Smart Fallback] Phase 2 failed (\${e2.message}), cascading to Phase 4 (Upstream)...\`);
                // Wait for the Upstream phase to be added later
            }
        }
    }

    // OLD FALLBACK (TEMPORARY until Phase 3/4 are integrated in next steps)
    if (!forceEngine || forceEngine === "layer4" || forceEngine === "layer3") {
        try {
            const data = await executeYtDlpExtract(url);
            const result = {
                engineUsed: "Force Layer 4: ASocks + yt-dlp",
                title: data.title || "Video",
                duration: data.duration || 0,
                thumbnail: data.thumbnail || null,
                formats: data.formats || [],
                video_url: data.formats?.[0]?.url || ""
            };
            metaCache.set(url, { data: result, expires: Date.now() + CACHE_TTL_MS });
            return result;
        } catch (engineErr: any) {
            throw new Error(\`Total engine failure: \${engineErr.message}\`);
        }
    }

    throw new Error(\`Forced engine '\${forceEngine}' failed or is not fully implemented yet.\`);
}
`;
    code = code.substring(0, startMeta) + newFetchMeta + code.substring(endMeta);
}

fs.writeFileSync(file, code, 'utf8');
console.log('Patched fetchSmartMetadata with Phase 1 and 2.');
