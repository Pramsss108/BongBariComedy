const fs = require('fs');
let code = fs.readFileSync('server/routes/downloader.ts', 'utf8');

const replacement = `        const response = await fetch("http://78.47.104.43:9000/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: url })
        });

        const fetchEnd = performance.now();
        console.log(`[Trace ⚱️] Hetzner PREVIEW Engine Responded in ${Math.round(fetchEnd - fetchStart)}ms`);

        if (response.ok) {
            const data = await response.json() as any;
            const streamUrl = data?.url;

            if (streamUrl) {
                streamCache.set(url, { url: streamUrl, expires: Date.now() + CACHE_TTL_MS });`;

const lastIdx = code.lastIndexOf('http://78.47.104.43:9000/stream-url');
if (lastIdx > -1) {
    const endBlock = code.indexOf('streamCache.set(url', lastIdx);
    const superEnd = code.indexOf(';', endBlock) + 1;
    
    code = code.substring(0, lastIdx - 39) + replacement + code.substring(superEnd);
    fs.writeFileSync('server/routes/downloader.ts', code);
    console.log('pwned streamUrl proxy');
} 