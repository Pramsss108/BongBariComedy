const fs = require('fs');
let code = fs.readFileSync('server/routes/downloader.ts', 'utf8');

const pStart = code.indexOf('      console.log([Phase 2] Requesting fast PREVIEW proxy from Hetzner for: );');
const pEnd = code.indexOf('      } catch (err: any) {', pStart);

if (pStart > -1 && pEnd > -1) {
    const toReplace = code.substring(pStart, pEnd);
    const newStr =       console.log(\[Phase 2] Requesting fast PREVIEW proxy from Hetzner for: \\);
      const fetchStart = performance.now();
      try {
        const fetch = (await import("node-fetch")).default;
        const response = await fetch("http://78.47.104.43:9000/", { 
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: url })
        });

        const fetchEnd = performance.now();
        console.log(\[Trace ⏱️] Hetzner PREVIEW Engine Responded in \ms\);

        if (response.ok) {
            const data = await response.json() as any;
            const streamUrl = data?.url;

            if (streamUrl) {
                streamCache.set(url, { url: streamUrl, expires: Date.now() + CACHE_TTL_MS });
                res.json({ streamUrl });
                return;
            }
        }
        throw new Error("Hetzner returned ok but missing stream URL.");

;
    code = code.substring(0, pStart) + newStr + code.substring(pEnd);
    fs.writeFileSync('server/routes/downloader.ts', code);
    console.log('Successfully patched handleProxyStream!');
} else {
    console.log('Failed to find block.', pStart, pEnd);
}
