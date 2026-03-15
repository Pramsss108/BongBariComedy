const fs = require('fs');
let uiCode = fs.readFileSync('client/src/pages/VoiceHub.tsx', 'utf8');

const snip2Start = "{/* Speed control \u2014 only for ENG Kokoro";
const snip2End = "</div>\n                </div>\n            )}";
// Wait, the speed control might be useful later, but the user said "remove all dropdowns like english".
// But let's check VoiceHub.tsx line by line for any more select tags.
const regexMoreSelects = /<select.*?<\/select>/gs;
uiCode = uiCode.replace(regexMoreSelects, " ");

fs.writeFileSync('client/src/pages/VoiceHub.tsx', uiCode);
console.log('Done!');
