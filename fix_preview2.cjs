const fs = require('fs');
let c = fs.readFileSync('server/routes/downloader.ts', 'utf8');

c = c.replace(
    'if (!match) match = body.match(/<meta property="og:video:url" content="([^"]+)"/);',
    'if (!match) match = body.match(/<meta property="og:video:url" content="([^"]+)"/);\n              if (!match) match = body.match(/"video_url":"([^"]+)"/);\n              if (!match) {\n                  const fbMatch = body.match(/"playable_url_quality_hd":"([^"]+)"/);\n                  if (fbMatch) match = fbMatch;\n              }'
);

fs.writeFileSync('server/routes/downloader.ts', c);
console.log("Regex expanded!");