const targetURLs = [
  "https://www.instagram.com/reel/C-s7_vJvX1a/",
  "https://www.youtube.com/watch?v=jNQXAC9IVRw",
  "https://www.facebook.com/watch/?v=10153231379946729"
];

const WORKER_URL = "https://ancient-king-7fa9.guitarguitarabhijit.workers.dev/";

async function testSwarm() {
  console.log("🚀 Testing Layer 5: Cloudflare Swarm Proxy\n");

  for (const target of targetURLs) {
    console.log(`\n======================================================`);
    console.log(`🎯 TARGET: ${target}`);
    console.log(`🌐 ROUTING THROUGH: ${WORKER_URL}`);
    
    try {
      const startTime = Date.now();
      const res = await fetch(`${WORKER_URL}?url=${encodeURIComponent(target)}`, {
        headers: {
          // Cloudflare worker will delete these and use our spoofed ones
          "User-Agent": "Test-Agent-From-Node"
        }
      });
      
      const timeTaken = Date.now() - startTime;
      const text = await res.text();
      
      console.log(`\n✅ STATUS: ${res.status} ${res.statusText}`);
      console.log(`⏱️ SPEED: ${timeTaken}ms`);
      
      // Look for specific success markers in the HTML
      let statusMsg = "❌ Failed to identify proper content.";
      if (text.includes('instagram.com/')) statusMsg = "✅ Content Extracted";
      if (text.includes('playabilityStatus')) statusMsg = "✅ YouTube Video Data Extracted";
      if (text.includes('facebook')) statusMsg = "✅ Facebook Page Extracted";
      
      console.log(`📊 CONTENT CHECK: ${statusMsg}`);
      console.log(`📝 PREVIEW (First 200 chars):\n${text.substring(0, 200)}...\n`);
      
    } catch (e) {
      console.log(`❌ ERROR: ${e.message}`);
    }
  }
}

testSwarm();
