const fs = require('fs');
const s = fs.readFileSync('server/routes/downloader.ts', 'utf8');
const lines = s.split('\n');
lines.forEach((l, i) => { 
    if(l.includes('layer2')) console.log(i + ': ' + l); 
});
