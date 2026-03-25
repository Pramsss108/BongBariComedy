const fs = require('fs');
let code = fs.readFileSync('server/routes/downloader.ts', 'utf8');

code = code.replace(/url: validated\.url,\s*isAudioOnly: chosen\.isAudio/g, `url: validated.url,
                  vQuality: "720",
                  vCodec: "h264",
                  isAudioOnly: chosen.isAudio`);

fs.writeFileSync('server/routes/downloader.ts', code);
console.log("Successfully added vQuality and vCodec to yt Hetzner payload");
