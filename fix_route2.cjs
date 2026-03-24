const fs = require('fs');
let c = fs.readFileSync('server/routes/downloader.ts', 'utf8');
c = c.replace('app.get("/api/downloader/proxy-stream", handleProxyStream);', 'app.use("/api/downloader/proxy-stream", handleProxyStream);');
fs.writeFileSync('server/routes/downloader.ts', c);
console.log('Changed app.get to app.use for proxy-stream to accept HEAD requests as well.');
