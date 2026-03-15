const fs = require('fs');
let uiCode = fs.readFileSync('client/src/lib/bengali-tts-webgpu.ts', 'utf8');
uiCode = uiCode.replace(/currentProgressCallback\(Downloading AI Brain.*?\);/g, "currentProgressCallback('Downloading AI Brain... ' + pct + '%', pct);");
fs.writeFileSync('client/src/lib/bengali-tts-webgpu.ts', uiCode);
