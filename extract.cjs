const fs = require('fs');
let c = fs.readFileSync('server/routes/downloader.ts', 'utf8');
let q = c.indexOf('async function handleProxyStream');
let lines = c.split('\n');
let i = 0;
for(let x=0; x<lines.length; x++) {
  if (lines[x].includes('function handleProxyStream')) { i = x; break; }
}
console.log(lines.slice(i, i+170).join('\n'));
