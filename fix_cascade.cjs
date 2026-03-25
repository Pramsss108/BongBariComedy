const fs = require('fs');
let c = fs.readFileSync('server/routes/downloader.ts', 'utf8');

c = c.replace(
    'if (!bestStreamUrl && isMeta && ((!forceEngine) || forceEngine === "layer2" || forceEngine === "layer1")) {',
    'if (!bestStreamUrl && isMeta && (!forceEngine || forceEngine === "layer2")) {'
);

c = c.replace(
    'if (!bestStreamUrl && ((!forceEngine) || forceEngine === "layer4" || forceEngine === "layer2" || forceEngine === "layer1")) {',
    'if (!bestStreamUrl && (!forceEngine || forceEngine === "layer4" || forceEngine === "layer3")) {'
);

fs.writeFileSync('server/routes/downloader.ts', c);
console.log("Cascade fixed!");
