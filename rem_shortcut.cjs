const fs = require('fs');
let code = fs.readFileSync('client/src/pages/SocialDownloaderPage.tsx', 'utf8');

const anchor = '<div className="absolute top-4 right-4 z-50">';
const startIdx = code.indexOf(anchor);

if (startIdx !== -1) {
    const nextStudioMode = code.indexOf('{/* FULLSCREEN STUDIO MODE OVERLAY */}', startIdx);
    if(nextStudioMode !== -1) {
       code = code.substring(0, startIdx) + code.substring(nextStudioMode);
       fs.writeFileSync('client/src/pages/SocialDownloaderPage.tsx', code);
       console.log('Removed duplicate shortcut help icon from main page layout!');
    }
}
