const fs = require('fs');

let data = fs.readFileSync('server/routes/downloader.ts', 'utf-8');

const aggregator = // ==========================================
// 💡 ZERO-COST OMNI-AGGREGATOR (Self-Healing Pool)
// ==========================================
let activeProxyPool: string[] = ["http://78.47.104.43:9000"]; // Default Hetzner node

async function refreshOmniAggregator() {
  console.log("[Omni-Aggregator ♻️] Fetching fresh Cobalt Network nodes...");
  try {
    const res = await axios.get("https://instances.cobalt.best/api/instances.json", { timeout: 10000 });
    const newPool = ["http://78.47.104.43:9000"]; // Always keep our own VPS as a reliable anchor
    
    if (Array.isArray(res.data)) {
        res.data.forEach((instance: any) => {
            if (instance?.api && instance?.cors !== 0) {
                const apiUrl = instance.api.endsWith('/') ? instance.api.slice(0, -1) : instance.api;
                if (!apiUrl.includes(".onion") && apiUrl.startsWith("http")) {
                    newPool.push(apiUrl);
                }
            }
        });
    }
    
    if (newPool.length > 2) {
        activeProxyPool = newPool;
        console.log(\[Omni-Aggregator ✅] Overwritten active pool with \ healthy nodes. (3-hour cycle)\);
    }
  } catch (error: any) {
    console.error("[Omni-Aggregator ❌] Failed to fetch master array:", error.message);
  }
}

// Start immediately and cycle every 3 hours
refreshOmniAggregator();
setInterval(refreshOmniAggregator, 3 * 60 * 60 * 1000);

// ==========================================
// 8-PHASE ARCHITECTURE: STANDALONE ENGINES
// ==========================================;

if (!data.includes("ZERO-COST OMNI-AGGREGATOR")) {
    data = data.replace('// ==========================================\n// 8-PHASE ARCHITECTURE: STANDALONE ENGINES\n// ==========================================', aggregator);
}

const oldPhase1Start = sync function executePhase1_HetznerCobalt(url: string): Promise<any> {
    console.log('[Phase 1] Executing Hetzner Cobalt for:', url);
    const HETZNER_URL = process.env.HETZNER_COBALT_URL || 'http://78.47.104.43:9000';

    // Anti-burst: slight human-like initial delay
    const initialJitter = Math.floor(Math.random() * 200) + 100;
    await new Promise(resolve => setTimeout(resolve, initialJitter));


    const response = await axios.post(
        HETZNER_URL,
        {;

const newPhase1Start = sync function executePhase1_HetznerCobalt(url: string): Promise<any> {
    console.log('[Phase 1] Executing Auto-Aggregator (Cobalt Nodes) for:', url);
    // Zero-Cost Roulette Array
    const HETZNER_URL = activeProxyPool[Math.floor(Math.random() * activeProxyPool.length)];
    const INITIAL_API = HETZNER_URL;

    // Anti-burst: slight human-like initial delay
    const initialJitter = Math.floor(Math.random() * 200) + 100;
    await new Promise(resolve => setTimeout(resolve, initialJitter));

    try {
      const response = await axios.post(
          HETZNER_URL,
          {;
          
data = data.replace(oldPhase1Start, newPhase1Start);

const oldPhase1End =     if (response.data && response.data.picker && response.data.picker[0]?.url) {
        return {
            engine: 'Force Layer 1: Cobalt API (Working/Free/YT)',
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
};

const newPhase1End =     if (response.data && response.data.picker && response.data.picker[0]?.url) {
        return {
            engine: 'Force Layer 1: Cobalt API (Working/Free/YT)',
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
  } catch (error: any) {
    // 🚑 INSTANT SELF-HEALING PURGE
    console.error(\[Phase 1] Node \ died (\). Purging from active pool...\);
    if (INITIAL_API !== "http://78.47.104.43:9000") {
        activeProxyPool = activeProxyPool.filter(p => p !== INITIAL_API);
    }
    throw new Error(\Phase 1: Network error to Cobalt node (\): \ + error.message);
  }
};

data = data.replace(oldPhase1End, newPhase1End);

fs.writeFileSync('server/routes/downloader.ts', data);
console.log("Success");
