const fs = require('fs');
let code = fs.readFileSync('server/routes/downloader.ts', 'utf8');

const anchor = 'DIRECT STREAM APPROACH FOR FULL VIDEOS';
const startIdx = code.indexOf(anchor);
const blockStart = code.lastIndexOf('} else {', startIdx);
const endIdx = code.indexOf('} catch (err: any) {', blockStart);
const replacement = `} else {
          console.log(\`\\n\\n🟢 [VIBE CODER ALERT] 👉 FULL VIDEO STREAM INITIATED!\`);
          console.log(\`[Phase 3] FULL VIDEO OR PREVIEW -> Fetching raw CDN URL from proxy for bypass!\`);
          
          try {
             const reqBody = { url: validated.url, format: chosen.ytFormat, isAudio: chosen.isAudio };
             const fetch = (await import("node-fetch")).default;
             const response = await fetch("http://78.47.104.43:9000/stream-url", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(reqBody)
             });
             if (response.ok) {
                 const textUrl = await response.text();
                 const urls = textUrl.split('\\n').map(u => u.trim()).filter(Boolean);
                 if (urls[0]) {
                     console.log(\`✅ [SUCCESS] Redirecting client directly to Hetzner CDN!\`);
                     res.redirect(302, urls[0]);
                     return;
                 }
             }
          } catch(proxyErr) {
             console.log(\`[Phase 3] Hetzner proxy failed. Falling back to Cobalt public instance...\`);
          }
          
          // Fallback to qwkuns API (Cobalt) if Hetzner fails
          const fetch = (await import("node-fetch")).default;
          const cobaltResponse = await fetch("https://api.qwkuns.me/", {
              method: "POST",
              headers: {
                  'Accept': 'application/json',
                  'Content-Type': 'application/json',
                  'User-Agent': 'BongBari-Server'
              },
              body: JSON.stringify({ url: validated.url })
          });
          const cobaltData = await cobaltResponse.json();
          if (cobaltData && cobaltData.url) {
             console.log(\`✅ [SUCCESS] Redirecting client directly to Cobalt CDN!\`);
             res.redirect(302, cobaltData.url);
             return;
          }
          throw new Error("Could not resolve raw CDN URL.");
      }
    `;

let newCode = code.slice(0, blockStart) + replacement + code.slice(endIdx);
fs.writeFileSync('server/routes/downloader.ts', newCode);
console.log('Successfully replaced block!');