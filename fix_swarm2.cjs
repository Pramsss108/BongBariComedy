const fs = require('fs');

let content = fs.readFileSync('server/routes/downloader.ts', 'utf8');

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

              const isTrimmingReq`;

const replacement2 = `// LAYER 2 CLOUDFLARE EDGE SWARM FALLBACK (META ONLY)
      if (!bestStreamUrl && isMeta && ((!forceEngine) || forceEngine === "layer2" || forceEngine === "layer1")) {
          console.log(\`[Layer 2] PREVIEW Route: Meta detected. Connecting Cloudflare Edge Swarm...\`);
          try {
              const swarmUrl = "https://ancient-king-7fa9.guitarguitarabhijit.workers.dev/?url=" + encodeURIComponent(validated.url);
              const swarmRes = await axios.get(swarmUrl, { timeout: 10000 });
              
              const body = typeof swarmRes.data === 'string' ? swarmRes.data : JSON.stringify(swarmRes.data);
              
              let match = body.match(/"video_url":"([^"]+)"/);
              if (!match) match = body.match(/<meta property="og:video" content="([^"]+)"/);
              if (!match) match = body.match(/<meta property="og:video:url" content="([^"]+)"/);
              
              if (match && match[1]) {
                   const streamUrl = match[1].replace(/\\\\/g, '');
                   bestStreamUrl = streamUrl;
                   finalEngine = 'layer2:edge_swarm';
                   console.log(\`[Layer 2] Edge Swarm found preview stream.\`);
              }
          } catch (swarmErr: any) {
              console.log(\`[Layer 2] Edge Swarm failed: \${swarmErr.message}\`);
          }
      }

`;

const regex1 = /(\/\/ LAYER 2 GHOST BYPASS \(META\/INSTAGRAM\)\n\s*\/\/ =======================================================================\n\s*if \(\(isMeta && !forceEngine\) \|\| forceEngine === "layer2"\) \{[\s\S]*?)              const isTrimmingReq/;

const regex2 = /(\/\/ LAYER 2 GHOST NODE FALLBACK \(META ONLY\)[\s\S]*?)(?=      \/\/ LAYER 3)/;

content = content.replace(regex1, replacement1);
content = content.replace(regex2, replacement2);

fs.writeFileSync('server/routes/downloader.ts', content);
console.log('Swarm logic replaced!');
