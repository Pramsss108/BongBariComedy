const fs = require('fs');

let code = fs.readFileSync('client/src/pages/VoiceHub.tsx', 'utf8');

// 1. Add loadProgress state where progressMsg is
code = code.replace(
    'const [progressMsg, setProgressMsg] = useState<string | null>(null);',
    'const [progressMsg, setProgressMsg] = useState<string | null>(null);\n    const [loadProgress, setLoadProgress] = useState<number>(0);'
);

// 2. Clear progress on generation start
code = code.replace(
    'setProgressMsg(null);',
    'setProgressMsg(null);\n        setLoadProgress(0);'
);

// 3. Update the handleBengaliTTS input signature
code = code.replace(
    'onProgress?: (msg: string) => void,',
    'onProgress?: (msg: string, pct?: number) => void,'
);

// 4. Update the handleBengaliTTS call
code = code.replace(
    '(msg) => setProgressMsg(msg),',
    '(msg: string, pct?: number) => { setProgressMsg(msg); if (pct !== undefined) setLoadProgress(pct); },'
);

// 5. Build the new visually distinct progress bar
const newLoader = \
                {isGenerating && (
                    <div className="mt-4 px-2">
                        <div className="mb-2 flex items-center justify-between text-[#F59E0B] text-xs font-bold uppercase tracking-widest">
                            <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> {progressMsg || "INITIALIZING CORE..."}</span>
                        </div>
                        {loadProgress > 0 && (
                            <div className="w-full bg-white/5 rounded-full h-2 border border-white/10 overflow-hidden">
                                <div className="bg-gradient-to-r from-[#F59E0B] to-yellow-300 h-full transition-all duration-300" style={{ width: \\\\%\n\\\ }} />
                            </div>
                        )}
                    </div>
                )}\;


// 6. Delete the Dropdown layout sections completely using exact substrings 
// (We search from '<div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">' down to '{fallbackWarning && (')
const startIdx = code.indexOf('<div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">');
if (startIdx !== -1) {
    const endWarningIdx = code.indexOf('{fallbackWarning && (', startIdx);
    const endGenIdx = code.indexOf('{isGenerating && (', startIdx);
    let endIdx = endWarningIdx !== -1 && endWarningIdx < endGenIdx ? endWarningIdx : endGenIdx;
    
    if (endIdx !== -1) {
        let replacement = code.substring(startIdx, endIdx);
        code = code.replace(replacement, "");
    }
}

// 7. Inject the loader
code = code.replace(/\{isGenerating && \([\s\S]*?<\/div>\s*\)\}/, newLoader);

fs.writeFileSync('client/src/pages/VoiceHub.tsx', code);
