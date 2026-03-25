const fs = require('fs');

const file = 'server/routes/downloader.ts';
let code = fs.readFileSync(file, 'utf8');

// We will find `async function fetchSmartMetadata` and replace it up to a certain point.
// I'll define separate functions: executePhase1, executePhase2 first... Wait, maybe I can just do clean blocks inside `fetchSmartMetadata` for `info`.

// Let's create `executePhase1_Cobalt` and `executePhase2_CFSwarm`
const injectCode = `
// ==========================================
// PHASE 1: FORCE LAYER 1 - COBALT API (HETZNER)
// ==========================================
async function executePhase1_Cobalt(url: string) {
  console.log('[Phase 1] Executing Hetzner Cobalt for:', url);
  try {
    const HETZNER_URL = global.HETZNER_COBALT_URL || 'http://hel1.r.y0n.de:9000';
    const response = await axios.post(
      \`\${HETZNER_URL}/`,
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
          'Content-Type': 'application/json'
        },
        timeout: 20000
      }
    );

    if (response.data && (response.data.url || response.data.video_url || response.data.picker)) {
      return {
        ...response.data,
        video_url: response.data.url || response.data.video_url || (response.data.picker && response.data.picker[0]?.url),
        source: 'cobalt',
        engineUsed: 'Force Layer 1: Cobalt API (Working/Free/YT)'
      };
    }
    throw new Error('Phase 1 Failed: Invalid response format from Hetzner Cobalt.');
  } catch (err) {
    console.error('[Phase 1 Failed]', err instanceof Error ? err.message : err);
    throw new Error('Phase 1: Cobalt API failed. ' + (err instanceof Error ? err.message : ''));
  }
}

// ==========================================
// PHASE 2: FORCE LAYER 2 - CF SWARM EDGE
// ==========================================
async function executePhase2_CFSwarm(url: string) {
  console.log('[Phase 2] Executing CF Swarm Edge for:', url);
  try {
    const workerUrl = 'https://wispy-sun-1aee.c-0-b-a-l-t.workers.dev/';
    const response = await axios.post(
      workerUrl,
      { url: url },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 15000,
        validateStatus: () => true
      }
    );

    if (response.data) {
      let finalUrl = null;
      if (response.data.url) finalUrl = response.data.url;
      else if (response.data.video_url) finalUrl = response.data.video_url;
      
      if (finalUrl) {
        return {
          video_url: finalUrl,
          title: response.data.title || "Phase 2 Swarm Video",
          source: 'cloudflare_swarm',
          engineUsed: 'Force Layer 2: CF Swarm Edge (Testing/Free/IG-FB)'
        };
      }
      
      // Fallback: Check if response is raw HTML with og:video
      if (typeof response.data === 'string') {
        const ogMatch = response.data.match(/<meta property="og:video" content="([^"]+)"/);
        if (ogMatch && ogMatch[1]) {
           return {
             video_url: ogMatch[1].replace(/&amp;/g, '&'),
             title: "Phase 2 Swarm Video",
             source: 'cloudflare_swarm',
             engineUsed: 'Force Layer 2: CF Swarm Edge (Testing/Free/IG-FB)'
           };
        }
      }
    }
    throw new Error('Phase 2 Failed: No valid video URL extracted from Swarm.');
  } catch (err) {
    console.error('[Phase 2 Failed]', err instanceof Error ? err.message : err);
    throw new Error('Phase 2: CF Swarm Edge failed. ' + (err instanceof Error ? err.message : ''));
  }
}

// Ensure fetchSmartMetadata can route properly
`;

// Just as a prototype, we should replace `fetchSmartMetadata` code carefully.
