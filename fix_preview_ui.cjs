const fs = require('fs');
let code = fs.readFileSync('client/src/pages/SocialDownloaderPage.tsx', 'utf8');

const search = 'proxy-stream?url=${encodeURIComponent(url)}&format=mp4-480&mode=stream&sessionId=${sessionId||""}`';
const replace = 'proxy-stream?url=${encodeURIComponent(url)}&format=mp4-480&mode=stream&sessionId=${sessionId||""}${forceEngine !== "auto" ? `&forceEngine=${forceEngine}` : ""}`';

if (code.includes(search)) {
    code = code.replace(search, replace);
    fs.writeFileSync('client/src/pages/SocialDownloaderPage.tsx', code);
    console.log("Patched SocialDownloaderPage.tsx preview player");
} else {
    console.log("Could not find proxy-stream string in SocialDownloaderPage.tsx");
}