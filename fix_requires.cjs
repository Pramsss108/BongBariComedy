const fs = require('fs');
let code = fs.readFileSync('server/routes/downloader.ts', 'utf8');

code = code.replace(/const axios = require\('axios'\);/g, '');
code = code.replace(/const ytdl = require\('@distube\/ytdl-core'\);/g, '');
code = code.replace(/const \{ getPoToken \} = require\('\.\.\/lib\/youtube\/poToken'\);/g, '');

fs.writeFileSync('server/routes/downloader.ts', code);
console.log('Fixed require statements.');