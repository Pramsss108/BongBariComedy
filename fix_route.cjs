const fs = require('fs');
let c = fs.readFileSync('server/routes/downloader.ts', 'utf8');
c = c.replace('app.get("/api/downloader/proxy-stream", infoLimiter, handleProxyStream);', 'app.get("/api/downloader/proxy-stream", handleProxyStream);');
fs.writeFileSync('server/routes/downloader.ts', c);
console.log('Removed infoLimiter from proxy-stream just to be sure.');
