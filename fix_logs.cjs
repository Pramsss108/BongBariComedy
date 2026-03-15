const fs = require('fs');

let uiCode = fs.readFileSync('client/src/lib/bengali-tts-webgpu.ts', 'utf8');

// Add console.log for inside the worker onmessage to track real state
uiCode = uiCode.replace(
    "const { type, progress, error, audio, sampleRate, message } = event.data;",
    "const { type, progress, error, audio, sampleRate, message } = event.data;\n                    console.log('[Worker Msg]', type, progress || message || error || '');"
);

// If status doesn't strictly match downloading, it was ignoring everything
uiCode = uiCode.replace(
    "if (currentProgressCallback && progress?.status === 'downloading') {",
    "if (currentProgressCallback && progress) {\n                            if (progress.status === 'downloading') {\n                                const pct = Math.floor(progress.progress || 0);\n                                currentProgressCallback('Downloading AI Brain... ' + pct + '%', Math.max(10, pct));\n                            } else {\n                                currentProgressCallback('System: ' + progress.status.toUpperCase() + '...', 10);\n                            }\n                        }"
);
// wait the first branch has '}' that needs cleanup
uiCode = uiCode.replace(
    /if \(currentProgressCallback && progress\?\..*?\}\n                        \}/s,
    "if (currentProgressCallback && progress) {\n                            if (progress.status === 'downloading') {\n                                const pct = Math.floor(progress.progress || 0);\n                                currentProgressCallback('Downloading AI Brain... ' + pct + '%', Math.max(10, pct));\n                            } else if (progress.status) {\n                                currentProgressCallback('Loading: ' + progress.status.toUpperCase() + '...', 15);\n                            }\n                        }"
);

fs.writeFileSync('client/src/lib/bengali-tts-webgpu.ts', uiCode);
console.log('Fixed worker logs');
