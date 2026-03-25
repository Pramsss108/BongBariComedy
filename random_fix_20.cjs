const fs = require('fs');
let code = fs.readFileSync('server/routes/downloader.ts', 'utf8');

const regex1 = /\n\s*\/\/\s*10 minute timeout.*?try\s*\{.*?if\s*\(isMeta\)\s*\{/s;
const replace1 = `
    // 10 minute timeout (increased for 4K remuxing)
    req.socket.setTimeout(600_000);

    try {
        const forceEngine = (req.query.forceEngine as string) || undefined;
        const isYT = validated.url.includes("youtube.com") || validated.url.includes("youtu.be");
        const isMeta = validated.url.includes("instagram.com") || validated.url.includes("facebook.com") || validated.url.includes("fb.watch");

        // LAYER 2 GHOST BYPASS (META/INSTAGRAM)
        if ((isMeta && !forceEngine) || forceEngine === "layer2") {`;

code = code.replace(regex1, replace1);

const regex2 = /\/\/\s*V14 SERVERLESS YOUTUBE STREAMING BYPASS.*?if\s*\(\(isYT && !forceEngine\) \|\| forceEngine === 'layer1'\)\s*\{|\/\/\s*V14 SERVERLESS YOUTUBE STREAMING BYPASS.*?if\s*\(isYT\)\s*\{/s;
const replace2 = `// V14 SERVERLESS YOUTUBE STREAMING BYPASS
      // Since Render IPs are totally tarpitted by BotGuard scraping, we MUST
      // resolve the exact CDN link using native node crypto, then 302 redirect
      // the client so their own residential IP downloads from Google directly.
      if ((isYT && !forceEngine) || forceEngine === "layer1") {`;

code = code.replace(regex2, replace2);

// Force skip fast path if layer3 forced
const regex3 = /\/\/\s*1\.\s*FAST-PATH DIRECT CDN REDIRECT.*?if\s*\(!requiresTempFile\)\s*\{/s;
const replace3 = `// 1. FAST-PATH DIRECT CDN REDIRECT (Full Videos Only, to prevent KB files)
    if (!requiresTempFile && forceEngine !== "layer3") {`;

code = code.replace(regex3, replace3);

fs.writeFileSync('server/routes/downloader.ts', code);
console.log("Patched completely.");
