const fs = require('fs');
let code = fs.readFileSync('server/routes/downloader.ts', 'utf8');
code = code.replace(/const isSplitTrack = data\.acodec === 'none' \|\| data\.vcodec === 'none';/g, \const isSplitTrack = !data.acodec || data.acodec === 'none' || data.vcodec === 'none';\);
fs.writeFileSync('server/routes/downloader.ts', code);
console.log('Patched split!');
