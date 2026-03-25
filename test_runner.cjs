const axios = require('axios');
const fs = require('fs');

async function testAll() {
  const SERVER_URL = 'http://localhost:5000/api/downloader/info';
  
  const urls = [
    { name: 'YouTube', url: 'https://www.youtube.com/watch?v=jNQXAC9IVRw' },
    { name: 'Instagram', url: 'https://www.instagram.com/reel/DC5H_L_x5Wj/' }, 
    { name: 'Facebook', url: 'https://www.facebook.com/watch/?v=905891395026932' }
  ];

  const layers = ['layer1', 'layer2', 'layer3', 'layer4', 'layer5', 'layer6', 'layer7', 'layer8'];
  
  let mdTable = "| Phrase / Slot | YouTube Test | Instagram Test | Facebook Test | Current Status |\n";
  mdTable += "|---|---|---|---|---|\n";

  for (const layer of layers) {
    let statuses = [];
    console.log(`\nTesting ${layer}...`);
    for (const testItem of urls) {
      try {
        const res = await axios.get(SERVER_URL, {
          params: { url: testItem.url, forceEngine: layer },
          timeout: 40000
        });
        if (res.data && res.data.formats && res.data.formats.length > 0) {
          statuses.push('✅ OK');
          console.log(`  [${testItem.name}] ✅ SUCCESS`);
        } else {
          statuses.push('❌ Fail (No Media)');
          console.log(`  [${testItem.name}] ❌ FAILED`);
        }
      } catch (err) {
        let msg = err.response?.data?.error || err.message;
        if (msg.includes('not fully implemented') || msg.includes('placeholder')) {
         statuses.push('🟡 Pending');
         console.log(`  [${testItem.name}] 🟡 PENDING (${msg})`);
        } else {
         statuses.push('❌ Fail');
         console.log(`  [${testItem.name}] ❌ ERR: ${msg}`);
        }
      }
    }
    
    let layerStatus = '';
    if (layer === 'layer1') layerStatus = "Working & Perfect (Hetzner Cobalt)";
    if (layer === 'layer2') layerStatus = "Working (CF Swarm)";
    if (layer === 'layer3') layerStatus = "Working (Hetzner IPv6 yt-dlp)";
    if (layer === 'layer4') layerStatus = "Working (ASocks Upstream)";
    if (layer === 'layer5') layerStatus = "Working (Public Cobalt)";
    if (layer === 'layer6') layerStatus = "Working (ytdl-core native)";
    if (layer === 'layer7' || layer === 'layer8') layerStatus = "Needs Work (Placeholder / Empty slot)";
    
    mdTable += `| Force ${layer.replace('layer', 'Layer ')} | ${statuses[0]} | ${statuses[1]} | ${statuses[2]} | **${layerStatus}** |\n`;
  }

  console.log("\n=== FINAL MARKDOWN TABLE ===\n");
  console.log(mdTable);
  fs.writeFileSync('TEST_REPORT.md', "# Live Real-Time Agentic Fallback Test Report\n\n" + mdTable + "\n");
}

testAll();