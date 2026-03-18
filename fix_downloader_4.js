const fs = require('fs');
let code = fs.readFileSync('server/routes/downloader.ts', 'utf8');
code = code.replace(/throw new Error(.*?Both engines failed.*?);\s*\}/, match => match + '\n    }');
fs.writeFileSync('server/routes/downloader.ts', code);
console.log('Fixed syntax!');
