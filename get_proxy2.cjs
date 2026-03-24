const fs = require('fs');
let c = fs.readFileSync('server/routes/downloader.ts', 'utf8');
let idx = c.indexOf('async function handleProxyStream');
console.log(c.substring(idx, idx + 1000));
