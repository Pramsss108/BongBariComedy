const fs = require('fs');

let uiCode = fs.readFileSync('client/src/pages/VoiceHub.tsx', 'utf8');

// The block starts right after the text-control div:
// ... </div> {/* end of text control box */}
// Then the grid starts.
uiCode = uiCode.replace(/<div className="grid grid-cols-1 md:grid-cols-2 gap-3">[\s\S]*?\{fallbackWarning &&/g, '{fallbackWarning &&');

fs.writeFileSync('client/src/pages/VoiceHub.tsx', uiCode);
console.log('Done!');
