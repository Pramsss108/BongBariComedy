const fs = require('fs');
let content = fs.readFileSync('server/routes/downloader.ts', 'utf8');

const s1 = "      // LAYER 2 GHOST BYPASS (META/INSTAGRAM)";
const e1 = "              const isTrimmingReq";

const startIndex = content.indexOf(s1);
const endIndex = content.indexOf(e1, startIndex);

if (startIndex > -1 && endIndex > -1) {
    const cut = content.substring(startIndex, endIndex);
    const replacement1 = `// LAYER 2 CLOUDFLARE EDGE SWARM (META/INSTAGRAM)
      // =======================================================================
      if ((isMeta && !forceEngine) || forceEngine === "layer2") {
          console.log(\`[Layer 2] Meta detected on stream route. Booting Cloudflare Edge Swarm...\`);
          try {
              const swarmUrl = "https://ancient-king-7fa9.guitarguitarabhijit.workers.dev/?url=" + encodeURIComponent(validated.url);
              const swarmRes = await axios.get(swarmUrl, { timeout: 10000 });
              
              let sourceStreamUrl = null;
              
              const body = typeof swarmRes.data === 'string' ? swarmRes.data : JSON.stringify(swarmRes.data);
              
              // Extract video url from meta tags or json
              let match = body.match(/"video_url":"([^"]+)"/);
              if (!match) match = body.match(/<meta property="og:video" content="([^"]+)"/);
              if (!match) match = body.match(/<meta property="og:video:url" content="([^"]+)"/);
              
              if (match && match[1]) {
                   sourceStreamUrl = match[1].replace(/\\\\/g, '');
                   console.log(\`[Layer 2] Edge Swarm Success: \${sourceStreamUrl.substring(0, 50)}...\`);
              } else {
                   throw new Error("No video_url found in Swarm payload");
              }

`;
    content = content.substring(0, startIndex) + replacement1 + content.substring(endIndex);
    fs.writeFileSync('server/routes/downloader.ts', content);
    console.log("Replaced 1 using substring!");
} else {
    console.log("Could not find start or end index:", startIndex, endIndex);
}