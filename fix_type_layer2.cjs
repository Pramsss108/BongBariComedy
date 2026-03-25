const fs = require('fs');
let content = fs.readFileSync('server/routes/downloader.ts', 'utf8');
content = content.replace("finalEngine = 'layer2:edge_swarm';", "");
fs.writeFileSync('server/routes/downloader.ts', content);
