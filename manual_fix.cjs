const fs = require('fs');

let uiCode = fs.readFileSync('client/src/pages/VoiceHub.tsx', 'utf8');

const snip1Start = '<div className="grid grid-cols-1 md:grid-cols-2 gap-3">';
const snip1End = "</div>\n                </div>\n\n                {/* Speed control";

let indexStart = uiCode.indexOf(snip1Start);
let indexEnd = uiCode.indexOf(snip1End);

if (indexStart !== -1 && indexEnd !== -1) {
    uiCode = uiCode.substring(0, indexStart) + "{/* Cleaned Dropdowns */}\n                " + uiCode.substring(indexEnd + "</div>\n                </div>\n".length);
    fs.writeFileSync('client/src/pages/VoiceHub.tsx', uiCode);
    console.log("Cleaned chunk 1!");
}
