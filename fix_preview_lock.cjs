const fs = require('fs');
let c = fs.readFileSync('server/routes/downloader.ts', 'utf8');

c = c.replace(
    'if (!bestStreamUrl && (!forceEngine || forceEngine === "layer4" || forceEngine === "layer3")) {',
    'if (!bestStreamUrl && (!forceEngine || forceEngine === "layer4" || forceEngine === "layer3")) {\n          // Explicitly block deep fallback if user forced a lighter layer that failed\n          if (forceEngine && !["layer4", "layer3"].includes(forceEngine)) {\n              console.warn(`[VIBE CODER] Engine ${forceEngine} failed. Aborting deep cascade.`);\n              return formatNotAvailable(res, `Forced Engine ${forceEngine} failed to find video.`, 500);\n          }'
);

// Add better console logging to Layer 2 preview
c = c.replace(
    'console.log(`[Layer 2] Edge Swarm failed: ${swarmErr.message}`);',
    'console.error(`[Layer 2] Edge Swarm fully crashed:`, swarmErr.message);\n              if (forceEngine === "layer2") {\n                  return formatNotAvailable(res, `Layer 2 Swarm Extraction Failed: ${swarmErr.message}`, 500);\n              }'
);

// Add regex fallback to see if we can catch anything else
c = c.replace(
    'if (match && match[1]) {',
    'console.log(`[Layer 2] Edge Swarm payload received. Checking for raw URLs...`);\n              if (!match) {\n                  // Maybe it returned JSON ?\n                  try {\n                      const j = JSON.parse(body);\n                      if (j && j.video_url) {\n                          match = [j.video_url, j.video_url];\n                      }\n                   } catch(e){}\n              }\n              \n              if (match && match[1]) {'
);


fs.writeFileSync('server/routes/downloader.ts', c);
console.log("Preview lock and Swarm logs added!");
