const fs = require('fs');

let uiCode = fs.readFileSync('client/src/pages/VoiceHub.tsx', 'utf8');

// The start string to match
const startString = '<div className="grid grid-cols-1 md:grid-cols-2 gap-3">';

// Using a regex to find everything from startString down to the warning/loader text
const pattern = /<div className="grid grid-cols-1 md:grid-cols-2 gap-3">[\s\S]*?(?:\{\/\*\s*Speed control[\s\S]*?\}\s*)?(?:\{language === 'ENG' && \([\s\S]*?\)\}\s*)?(?:\{fallbackWarning && \([\s\S]*?\)\}\s*)?\{isGenerating && \(/;

const newStartString = "{fallbackWarning && (\n" +
"                    <div className=\"text-[#F59E0B] text-xs font-bold uppercase tracking-wide bg-[#F59E0B]/10 p-3 rounded-lg border border-[#F59E0B]/20 animate-pulse\">\n" +
"                        âš ï¸  {fallbackWarning}\n" +
"                    </div>\n" +
"                )}\n\n" +
"                {isGenerating && (";


if (uiCode.match(pattern)) {
    uiCode = uiCode.replace(pattern, newStartString);
    fs.writeFileSync('client/src/pages/VoiceHub.tsx', uiCode);
    console.log("Successfully removed dropdowns!");
} else {
    console.log("Regex match failed. Falling back to targeted replacement.");
}

