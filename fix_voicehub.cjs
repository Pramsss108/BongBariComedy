const fs = require('fs');

let uiCode = fs.readFileSync('client/src/pages/VoiceHub.tsx', 'utf8');

// Add progress state
if (!uiCode.includes('const [loadProgress, setLoadProgress]')) {
    uiCode = uiCode.replace(
        "const [progressMsg, setProgressMsg] = useState<string | null>(null);",
        "const [progressMsg, setProgressMsg] = useState<string | null>(null);\n    const [loadProgress, setLoadProgress] = useState<number>(0);"
    );
}

// Clear progress state when generating
uiCode = uiCode.replace(
    "setProgressMsg(null);",
    "setProgressMsg(null);\n        setLoadProgress(0);"
);

// Capture progress in generateEnglishSpeech
uiCode = uiCode.replace(
    "url = await generateEnglishSpeech(text, englishVoice, (msg) => setProgressMsg(msg));",
    "url = await generateEnglishSpeech(text, englishVoice, (msg, pct) => { setProgressMsg(msg); if (pct) setLoadProgress(pct); });"
);

// Capture progress in handleBengaliTTS
uiCode = uiCode.replace(
    "const handleBengaliTTS = async (\n    text: string,\n    engineId: string,\n    onProgress?: (msg: string) => void,",
    "const handleBengaliTTS = async (\n    text: string,\n    engineId: string,\n    onProgress?: (msg: string, pct?: number) => void,"
);

uiCode = uiCode.replace(
    "(msg) => setProgressMsg(msg),",
    "(msg, pct) => { setProgressMsg(msg); if(pct !== undefined) setLoadProgress(pct); },"
);


// Replace the loader UI
const oldLoader = "{isGenerating && (\n                <div className=\"flex items-center gap-2 text-[#F59E0B] text-sm animate-pulse m-2\">\n                    <Loader2 className=\"w-4 h-4 animate-spin\" />\n                    <span className=\"uppercase tracking-widest\">{progressMsg || \"INITIALIZING...\"}</span>\n                </div>\n            )}";

const newLoader = "{isGenerating && (\n                <div className=\"m-2 space-y-3\">\n                    <div className=\"flex items-center gap-2 text-[#F59E0B] text-sm\">\n                        <Loader2 className=\"w-4 h-4 animate-spin\" />\n                        <span className=\"tracking-widest uppercase\">{progressMsg || \"INITIALIZING CORE...\"}</span>\n                    </div>\n                    {loadProgress > 0 && (\n                        <div className=\"w-full bg-white/5 rounded-full h-2 overflow-hidden border border-white/10\">\n                            <div className=\"bg-gradient-to-r from-[#F59E0B] to-yellow-300 h-full transition-all duration-300\" style={{ width: \\%\ }} />\n                        </div>\n                    )}\n                </div>\n            )}";

if (uiCode.includes(oldLoader)) {
    uiCode = uiCode.replace(oldLoader, newLoader);
} else {
    // try a rougher replace
     uiCode = uiCode.replace(
         /\{isGenerating && \(\s*<div.*?Loader2.*?\/div>\s*\)\}/s,
         newLoader
     );
}

// Remove unnecessary dropdowns
// The dropdown container part:
const dropdownToRemove = "<div className=\"mt-6 grid grid-cols-1 md:grid-cols-2 gap-4\">\n                    <div>\n                        <label className=\"block text-[10px] uppercase font-black tracking-[0.2em] text-white/40 mb-2\">\n                            Select Voice\n                        </label>";
const dropdownsRegex = /<div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">.*?label className="block text-\[10px\] uppercase font-black.*?Engine Status.*?<\/div>\s*<\/div>\s*<\/div>/s;

uiCode = uiCode.replace(dropdownsRegex, "");

fs.writeFileSync('client/src/pages/VoiceHub.tsx', uiCode);
console.log('Fixed UI Tracking and layout');
