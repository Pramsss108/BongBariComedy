const fs = require('fs');
const c = fs.readFileSync('server/routes/downloader.ts', 'utf8');
const i = c.indexOf('function handleProxyStream');
const lines = c.substring(i).split('\n').slice(0, 150).join('\n');
console.log(lines);
