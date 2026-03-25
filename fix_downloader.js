const fs = require('fs');
let code = fs.readFileSync('server/routes/downloader.ts', 'utf8');
code = code.replace(/\/\/ 10 minute timeout.*?try\s*\{.*?(?:if\s*\([^)]+\)\s*\{\s*console\.log\([^)]+Layer 2.*?Ghost Layer)/s, '    // 10 minute timeout\n    req.socket.setTimeout(600_000);\n\n    try {\n        const forceEngine = (req.query.forceEngine as string) || undefined;\n        const isYT = validated.url.includes(\'youtube.com\') || validated.url.includes(\'youtu.be\');\n        const isMeta = validated.url.includes(\'instagram.com\') || validated.url.includes(\'facebook.com\') || validated.url.includes(\'fb.watch\');\n\n        if ((isMeta && !forceEngine) || forceEngine === \'layer2\') {\n            console.log([Layer 2] Meta detected on stream route. Booting Ghost Layer');
code = code.replace(/\/\/ V14 SERVERLESS YOUTUBE STREAMING BYPASS.*?if\s*\(isYT\)\s*\{/s, '// V14 SERVERLESS YOUTUBE STREAMING BYPASS\n      if ((isYT && !forceEngine) || forceEngine === \'layer1\') {');
fs.writeFileSync('server/routes/downloader.ts', code);
console.log('Fixed routing!');
