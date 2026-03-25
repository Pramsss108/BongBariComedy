const fs = require('fs');
let code = fs.readFileSync('server/routes/downloader.ts', 'utf8');
code = code.replace(/\n\s*\/\/\s*10 minute timeout.*?try\s*\{.*?if\s*\(isMeta\)\s*\{/s, \\n    // 10 minute timeout (increased for 4K remuxing)\n    req.socket.setTimeout(600_000);\n\n    try {\n        const forceEngine = (req.query.forceEngine as string) || undefined;\n        const isYT = validated.url.includes('youtube.com') || validated.url.includes('youtu.be');\n        const isMeta = validated.url.includes('instagram.com') || validated.url.includes('facebook.com') || validated.url.includes('fb.watch');\n\n        if ((isMeta && !forceEngine) || forceEngine === 'layer2') {\);
fs.writeFileSync('server/routes/downloader.ts', code);
