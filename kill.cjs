const fs = require('fs');

let uiCode = fs.readFileSync('client/src/pages/VoiceHub.tsx', 'utf8');

// Debug: Look for exactly what's there
const idxStart = uiCode.indexOf('<div className="grid grid-cols-1 md:grid-cols-2 gap-3">');
const idxEnd = uiCode.indexOf('{isGenerating && (', idxStart);

if (idxStart !== -1 && idxEnd !== -1) {
    console.log("Found bounds: ", idxStart, idxEnd);
    const textToReplace = uiCode.substring(idxStart, idxEnd);
    
    // We only want to keep the fallback warning if it was in there, wait, the fallback warning IS inside the block or just before.
    uiCode = uiCode.replace(textToReplace, 
        "{fallbackWarning && (\n" +
        "                    <div className=\"text-[#F59E0B] text-xs font-bold uppercase tracking-wide bg-[#F59E0B]/10 p-3 rounded-lg border border-[#F59E0B]/20 animate-pulse\">\n" +
        "                        âš ï¸  {fallbackWarning}\n" +
        "                    </div>\n" +
        "                )}\n\n                "
    );
    fs.writeFileSync('client/src/pages/VoiceHub.tsx', uiCode);
    console.log("Wrote file");
} else {
    console.log("Could not find bounds");
}

