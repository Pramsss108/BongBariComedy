const fs = require('fs');
let code = fs.readFileSync('server/routes/downloader.ts', 'utf8');

const target1 = `  const isStreamMode = req.query.mode === 'stream';`;
const replace1 = `  const isStreamMode = req.query.mode === 'stream';\n  const forceEngine = (req.query.forceEngine as string) || undefined;`;

if(code.includes(target1) && !code.includes(`const forceEngine = (req.query.forceEngine as string) || undefined;`)) {
    code = code.replace(target1, replace1);
    console.log("Added forceEngine extracting to handleProxyStream");
} else {
    console.log("already extracted");
}

const target2 = `      const isYT = validated.url.includes("youtube.com") || validated.url.includes("youtu.be");
      if (isYT) {
          // ── PROVEN METHOD: Route through Hetzner VPS`;

const replace2 = `      const isYT = validated.url.includes("youtube.com") || validated.url.includes("youtu.be");
      if ((isYT && (!forceEngine || forceEngine === "layer1")) || forceEngine === "layer1") {
          // ── PROVEN METHOD: Route through Hetzner VPS`;

if(code.includes(target2)) {
    code = code.replace(target2, replace2);
    console.log("Added conditional to Phase 2 Hetzner block inside proxy-stream");
} else {
    const isYtAlt = `      if (isYT) {\n          // ── PROVEN METHOD:`;
    if(code.includes(isYtAlt)) {
        code = code.replace(isYtAlt, `      if ((isYT && (!forceEngine || forceEngine === "layer1")) || forceEngine === "layer1") {\n          // ── PROVEN METHOD:`);
    } else {
        console.log("Could not find Hetzner proxy-stream call.");
    }
}

fs.writeFileSync('server/routes/downloader.ts', code);
