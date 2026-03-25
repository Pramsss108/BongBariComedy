const fs = require('fs');
let code = fs.readFileSync('server/routes/downloader.ts', 'utf8');

code = code.replace(/if \(\!forceEngine \|\| forceEngine === "layer3"\) \{/g, 'if (!forceEngine || forceEngine === "layer3" || forceEngine === "layer2") {');

fs.writeFileSync('server/routes/downloader.ts', code);
console.log("Patched!");
