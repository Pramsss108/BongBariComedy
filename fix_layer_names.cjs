const fs = require('fs');
let c = fs.readFileSync('server/routes/downloader.ts', 'utf8');

c = c.replace(/\/\/ LAYER 3 \(YT-DLP NATIVE\)/g, '// LAYER 4 (ASOCKS + YT-DLP)');
c = c.replace(/\[Layer 3\] PREVIEW Route/g, '[Layer 4] PREVIEW Route');
c = c.replace(/\[Layer 3\] Falling back to/g, '[Layer 4] Falling back to');
c = c.replace(/finalEngine = 'layer3_ytdlp'/g, "finalEngine = 'Layer 4 (ASocks + yt-dlp)'");
c = c.replace(/finalEngine = 'layer1:cobalt'/g, "finalEngine = 'Layer 1 (Free Cobalt)'");

// Add proper finalEngine to Layer 2 Edge Swarm
c = c.replace(
    'bestStreamUrl = streamUrl;',
    "bestStreamUrl = streamUrl;\n                   finalEngine = 'Layer 2 (Free Meta Edge Swarm)';"
);

fs.writeFileSync('server/routes/downloader.ts', c);
console.log("Renamed logs and engines.");
