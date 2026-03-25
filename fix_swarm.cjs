const fs = require('fs');
let code = fs.readFileSync('server/routes/downloader.ts', 'utf8');

const ghostRegex = /\/\/ =========================================================================\s*\n\s*\/\/ LAYER 2 GHOST BYPASS[\s\S]*?(?=\/\/ =========================================================================\s*\n\s*\/\/ LAYER [34] )/s;

const swarmLogic = `// =========================================================================
      // LAYER 2 CLOUDFLARE EDGE SWARM (INSTAGRAM & FACEBOOK)
      // =========================================================================
      if ((isMeta && !forceEngine) || forceEngine === "layer2") {
          console.log("[Layer 2] Routing through Cloudflare Edge Swarm...");
          try {
              const WORKER_URL = "https://ancient-king-7fa9.guitarguitarabhijit.workers.dev/";
              const res = await axios.get(\`\${WORKER_URL}?url=\${encodeURIComponent(validated.url)}\`, { timeout: 15000 });
              
              if (res.data) {
                  const html = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
                  const videoMatch = html.match(/"video_url":\\s*"([^"]+)"/);
                  if (videoMatch) {
                      let cleanUrl = videoMatch[1].replace(/\\\\u0026/g, '&').replace(/\\\\\\//g, '/');
                      console.log("[Layer 2] Swarm Extracted Success!");
                      res.redirect(302, cleanUrl);
                      return;
                  }
                  
                  console.log(\`[Layer 2] Payload downloaded from Swarm (Length: \${html.length}), but no direct MP4 found in HTML. Falling back...\`);
              }
              
              if (forceEngine === "layer2") {
                  throw new Error("Swarm Payload bypassed bot check but could not extract raw .mp4 string. Meta GraphQL is obfuscating the file.");
              }
          } catch (e: any) {
              console.log("[Layer 2] Swarm failed or missing url: " + e.message);
              if (forceEngine === "layer2") {
                  if (!res.headersSent) res.status(422).json({ error: "Layer 2 forced, but Cloudflare Swarm failed: " + e.message });
                  return;
              }
          }
      }

      `;

if (code.match(ghostRegex)) {
    code = code.replace(ghostRegex, swarmLogic);
    fs.writeFileSync('server/routes/downloader.ts', code);
    console.log('Swarm logic embedded!');
} else {
    console.log('Regex match failed');
    // fallback if LAYER 3 is missing, might be LAYER 4
    const ghostRegex2 = /\/\/ =========================================================================\s*\n\s*\/\/ LAYER 2 GHOST BYPASS[\s\S]*?(?=\/\/ LAYER [34] yt-dlp)/s;
    if (code.match(ghostRegex2)) {
        code = code.replace(ghostRegex2, swarmLogic + '// ');
        fs.writeFileSync('server/routes/downloader.ts', code);
        console.log('Swarm logic embedded 2!');
    } else {
        console.log("Still failed... writing debug out");
    }
}
