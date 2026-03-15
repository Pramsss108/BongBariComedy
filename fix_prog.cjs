const fs = require('fs');
let code = fs.readFileSync('client/src/pages/VoiceHub.tsx', 'utf8');

const targetButton = "{isGenerating ? (\\s*<>\\s*<Loader2 className=\"w-5 h-5 animate-spin\" \/>\\s*Loading Bong Bari\\.\\.\\.\\s*<\/\\>\\s*) :";
code = code.replace(/\{isGenerating \? \([\s\S]*?\) : \(/, "{isGenerating ? (\n" +
"                        <div className=\"flex flex-col w-full items-center justify-center px-4 space-y-1\">\n" +
"                            <div className=\"flex items-center gap-2\">\n" +
"                                <Loader2 className=\"w-5 h-5 animate-spin\" />\n" +
"                                <span className=\"tracking-widest uppercase text-xs\">{progressMsg || \"INITIALIZING CORE...\"}</span>\n" +
"                            </div>\n" +
"                            {loadProgress > 0 && (\n" +
"                                <div className=\"w-full max-w-[200px] bg-black/40 rounded-full h-1.5 overflow-hidden border border-white/10 mt-1\">\n" +
"                                    <div className=\"bg-gradient-to-r from-yellow-500 to-[#F59E0B] h-full transition-all duration-300\" style={{ width: \\%\ }} />\n" +
"                                </div>\n" +
"                            )}\n" +
"                        </div>\n" +
"                    ) : (");
fs.writeFileSync('client/src/pages/VoiceHub.tsx', code);
