const fs = require('fs');

const p5p6 = `
// ==========================================
// PHASE 5: Public Cobalt Node Array (Free)
// ==========================================
async function executePhase5_ExpansionA(url: string): Promise<any> {
    console.log('[Phase 5] Executing Public Cobalt Array for:', url);
    const publicNodes = [
        "https://cobalt.api.timeless-coder.com",
        "https://api.cobalt.tools",
        "https://cobalt.kim"
    ];
    const axios = require('axios');
    for (const node of publicNodes) {
        try {
            const response = await axios.post(node, {
                url: url, aFormat: "best", vQuality: "1080", isAudioOnly: false, isTTfullAudio: true
            }, {
                headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
                timeout: 5000
            });
            if (response.data && response.data.status === 'stream' && response.data.url) {
                return {
                    engine: 'Force Layer 5: Public Cobalt Array (Free)',
                    video_url: response.data.url,
                    title: response.data.title || "Public Cobalt Video",
                    duration: 0,
                    thumbnail: null,
                    formats: [{ ext: "mp4", height: 720, url: response.data.url, id: "mp4-720", label: "MP4 720p" }]
                };
            }
        } catch (e: any) {
            console.log(\`[Phase 5] Node \${node} failed, trying next...\`);
        }
    }
    throw new Error('Phase 5: All Public Cobalt nodes failed.');
}

// ==========================================
// PHASE 6: Direct ytdl-core + BotGuard Bypass
// ==========================================
async function executePhase6_ExpansionB(url: string): Promise<any> {
    console.log('[Phase 6] Executing YTDL-Core + BotGuard Bypass for:', url);
    const ytdl = require('@distube/ytdl-core');
    const { getPoToken } = require('../lib/youtube/poToken');
    
    const { visitorData, poToken } = await getPoToken();
    const info = await ytdl.getInfo(url, {
        requestOptions: {
            headers: {
                'X-Youtube-Identity-Token': poToken,
                'X-Goog-Visitor-Id': visitorData
            }
        }
    });

    const mergedFormats = info.formats.filter((f: any) => f.hasVideo && f.hasAudio);
    let selectedFormat = mergedFormats.find((f: any) => (f.height || 0) <= 720) || ytdl.chooseFormat(mergedFormats, { quality: 'highest' });
    
    if (!selectedFormat || !selectedFormat.url) throw new Error('Phase 6: No stream url found in ytdl-core');

    return {
        engine: 'Force Layer 6: YTDL-Core Native (Backup)',
        video_url: selectedFormat.url,
        title: info.videoDetails.title || "YTDL-Core Video",
        duration: parseInt(info.videoDetails.lengthSeconds) || 0,
        thumbnail: info.videoDetails.thumbnails?.[0]?.url || null,
        formats: [{ ext: "mp4", height: selectedFormat.height || 720, url: selectedFormat.url, id: "mp4-720", label: "MP4 720p" }]
    };
}
`;

let tsCode = fs.readFileSync('server/routes/downloader.ts', 'utf8');

tsCode = tsCode.replace(/\/\/ ==========================================\n\/\/ PHASE 5: Expansion Slot A[\s\S]*?throw new Error\('Phase 6 is a placeholder and not fully implemented yet\.'\);\n\}/m, p5p6.trim());

fs.writeFileSync('server/routes/downloader.ts', tsCode);
console.log('Injected real logic for Phrase 5 and 6.');
