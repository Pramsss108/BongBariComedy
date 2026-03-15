const fs = require('fs');

let uiCode = fs.readFileSync('client/src/lib/bengali-tts-webgpu.ts', 'utf8');

// 1. Fix startGeneration to use correct payload
uiCode = uiCode.replace(
    "                ttsWorker?.postMessage({\n                    type: 'generate',\n                    text: text\n                });",
    "                ttsWorker?.postMessage({\n                    action: 'generate',\n                    payload: text\n                });"
);
uiCode = uiCode.replace(
    "                ttsWorker?.postMessage({\n                    type: \"generate\",\n                    text\n                });",
    "                ttsWorker?.postMessage({\n                    action: 'generate',\n                    payload: text\n                });"
);

// 2. Add INIT message right after the onmessage declaration
uiCode = uiCode.replace(
    "                ttsWorker.onerror = (error) => {\n                    isModelLoading = false;",
    "                ttsWorker.onerror = (error) => {\n                    isModelLoading = false;"
);

// Ensure the init message is sent right after creating the worker
const initSend = "                ttsWorker.postMessage({ action: 'init' });\n";
if (!uiCode.includes("action: 'init'")) {
    uiCode = uiCode.replace(
        "                ttsWorker.onmessage = (event) => {",
        initSend + "                ttsWorker.onmessage = (event) => {"
    );
}

// 3. Fix downloading percentage status tracking (Real not fake percentage)
uiCode = uiCode.replace(
    "currentProgressCallback('Downloading ONNX weights...', 10 + Math.floor(progress.progress * 0.8));",
    "const pct = Math.floor(progress.progress || 0);\n                            currentProgressCallback(Downloading AI Brain... \%, pct);"
);
// In case it used double quotes
uiCode = uiCode.replace(
    "currentProgressCallback(\"Downloading ONNX weights...\", 10 + Math.floor(progress.progress * 0.8));",
    "const pct = Math.floor(progress.progress || 0);\n                            currentProgressCallback(Downloading AI Brain... \%, pct);"
);

fs.writeFileSync('client/src/lib/bengali-tts-webgpu.ts', uiCode);
console.log('Fixed WebWorker communications and real percentage');
