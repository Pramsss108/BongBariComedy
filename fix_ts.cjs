const fs = require('fs');

let uiCode = fs.readFileSync('client/src/lib/bengali-tts-webgpu.ts', 'utf8');

uiCode = uiCode.replace('function startGeneration() {', 'const startGeneration = () => {');

fs.writeFileSync('client/src/lib/bengali-tts-webgpu.ts', uiCode);
console.log('Fixed TS syntax');
