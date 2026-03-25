const fs = require('fs');
let c = fs.readFileSync('server/routes/downloader.ts', 'utf8');

c = c.replace(
    'console.error(`[Layer 2] Ghost Node bypass failed!`, metaErr.message);',
    'console.error(`[Layer 2] Edge Swarm bypass failed!`, metaErr.message);\n               if (forceEngine === "layer2") {\n                   return res.status(500).json({ error: "Layer 2 Forced but Failed: " + metaErr.message });\n               }'
);

fs.writeFileSync('server/routes/downloader.ts', c);
console.log("Stream locking fixed!");
