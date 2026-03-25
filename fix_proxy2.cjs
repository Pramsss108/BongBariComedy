const fs = require('fs');
let code = fs.readFileSync('server/routes/downloader.ts', 'utf8');

// 1. Remove duplicate forceEngine declaration
code = code.replace(/  const forceEngine = \(req\.query\.forceEngine as string\) \|\| undefined;\r?\n  const forceEngine = \(req\.query\.forceEngine as string\) \|\| undefined;\r?\n/g, "  const forceEngine = (req.query.forceEngine as string) || undefined;\n");

// 2. Fix the Hetzner block inside proxy-stream
// We look for 'if (isYT) {' followed by the PROVEN METHOD string
code = code.replace(/if\s*\(isYT\)\s*\{\s*\/\/\s*──\s*PROVEN METHOD: Route through Hetzner VPS/g, 
`if ((isYT && (!forceEngine || forceEngine === "layer1")) || forceEngine === "layer1") {
          // ── PROVEN METHOD: Route through Hetzner VPS`);

fs.writeFileSync('server/routes/downloader.ts', code);
console.log("Cleanup done.");
