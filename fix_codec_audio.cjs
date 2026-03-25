const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'server/routes/downloader.ts');

let content = fs.readFileSync(file, 'utf8');

// The main issue: supplying vCodec: "h264" directly to Cobalt API makes it prefer a raw h264 track, which is often audio-less.
// We remove `vCodec: "h264"` and `vQuality: "720"` so we get the default pre-muxed mp4 format.
content = content.replace(/vCodec:\s*"h264",?/g, '');
content = content.replace(/vQuality:\s*"720",?/g, '');
content = content.replace(/aFormat:\s*"mp3",?/g, '');

// Clean up any trailing commas or empty spaces
content = content.replace(/,\s*\}/g, ' }');

fs.writeFileSync(file, content, 'utf8');
console.log('Removed specific vCodec constraints that were causing DASH audio split.');