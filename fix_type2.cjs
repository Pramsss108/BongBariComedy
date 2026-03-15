const fs = require('fs');
let uiCode = fs.readFileSync('client/src/pages/VoiceHub.tsx', 'utf8');

uiCode = uiCode.replace(
    "const handleBengaliTTS = async (\n    text: string,\n    engineId: string,\n    onProgress?: (msg: string) => void,\n    onFallback?: (warning: string) => void",
    "const handleBengaliTTS = async (\n    text: string,\n    engineId: string,\n    onProgress?: (msg: string, pct?: number) => void,\n    onFallback?: (warning: string) => void"
);

uiCode = uiCode.replace(
    /onProgress\?\: \(msg: string\) => void/,
    "onProgress?: (msg: string, pct?: number) => void"
);


fs.writeFileSync('client/src/pages/VoiceHub.tsx', uiCode);
console.log('Fixed signature');
