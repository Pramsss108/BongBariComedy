const fs = require('fs');
let code = fs.readFileSync('server/routes/downloader.ts', 'utf8');

code = code.replace(`isAudioOnly: chosen.isAudio,
                          vQuality: "720"`, `isAudioOnly: chosen.isAudio`);

fs.writeFileSync('server/routes/downloader.ts', code);
console.log("Fixed double vQuality!");