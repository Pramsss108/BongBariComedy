const fs = require('fs');

let backend = fs.readFileSync('server/routes/downloader.ts', 'utf-8');

const debugRoute = 
app.get('/api/admin/proxy-status', (req, res) => {
    res.json({
        poolSize: activeProxyPool.length,
        proxies: activeProxyPool,
        lastUpdated: Date.now()
    });
});
;

if (!backend.includes('/api/admin/proxy-status')) {
    backend = backend.replace("export const proxyRouter = app;", debugRoute + '\n\nexport const proxyRouter = app;');
    fs.writeFileSync('server/routes/downloader.ts', backend);
    console.log("Added proxy-status route");
} else {
    console.log("Already exists");
}
