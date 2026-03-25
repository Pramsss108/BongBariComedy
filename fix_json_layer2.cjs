const fs = require('fs');
let s = fs.readFileSync('server/routes/downloader.ts', 'utf8');

const t = `            // Just check if we get a hit to construct dummy metadata
            let match = body.match(/"video_url":"([^"]+)"/) || 
                        body.match(/<meta property="og:video" content="([^"]+)"/) ||
                        body.match(/"playable_url_quality_hd":"([^"]+)"/);`;

const p = `            // Just check if we get a hit to construct dummy metadata
            let match = body.match(/"video_url":"([^"]+)"/) || 
                        body.match(/<meta property="og:video" content="([^"]+)"/) ||
                        body.match(/"playable_url_quality_hd":"([^"]+)"/);
            
            if (!match) {
                try {
                    const j = JSON.parse(body);
                    if (j && j.video_url) match = [j.video_url, j.video_url];
                } catch(e) {}
            }`;

s = s.replace(t, p);
fs.writeFileSync('server/routes/downloader.ts', s);
