const fs = require('fs');
let code = fs.readFileSync('client/src/lib/bengali-tts-webgpu.ts', 'utf8');

// remove old startGeneration
code = code.replace(/const startGeneration = \(\) => \{\n\s*if \(currentProgressCallback\).*?\n\s*ttsWorker\?\.postMessage\(\{\n\s*type\: 'generate',\n\s*text\: text\n\s*\}\);\n\s*\}/g, '');

const newCode = 
            const startGeneration = () => {
                if (currentProgressCallback) currentProgressCallback("Injecting Breath markers and Synthesizing Bengali...");
                ttsWorker?.postMessage({
                    type: 'generate',
                    text: text
                });
            };

            if (!ttsWorker) {
;

code = code.replace('            if (!ttsWorker) {', newCode);

fs.writeFileSync('client/src/lib/bengali-tts-webgpu.ts', code);
console.log("Moved startGeneration");
