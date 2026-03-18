const fs = require('fs');
let file = 'server/routes/downloader.ts';
let code = fs.readFileSync(file, 'utf8');

const regex = /\}\s*else\s*\{\s*console\.log\([^]+\\n\\n[^]+FULL VIDEO STREAM[\s\S]+?\}\s*\}\s*catch\s*\(err:\s*any\)/;

let target = code.match(regex);
if(target) {
    let replaced = code.replace(regex, \} else {
          console.log(\[Phase 3] FULL VIDEO OR PREVIEW -> Fetching raw CDN URL from proxy for bypass!\);
          // Use our fast proxy stream
          const reqBody = { url: validated.url, format: chosen.ytFormat, isAudio: chosen.isAudio };
          const response = await fetch("http://78.47.104.43:9000/stream-url", {
             method: "POST",
             headers: { "Content-Type": "application/json" },
             body: JSON.stringify(reqBody)
          });
          if (response.ok) {
              const textUrl = await response.text();
              const urls = textUrl.split('\\n').map(u => u.trim()).filter(Boolean);
              if (urls[0]) {
                  console.log(\? [SUCCESS] Redirecting client directly to Google CDN!\);
                  return res.redirect(302, urls[0]);
              }
          }
          // Fallback to qwkuns API (Cobalt) if Hetzner fails
          console.log(\[Phase 3] Hetzner proxy failed. Falling back to Cobalt public instance...\);
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
             console.log(\? [SUCCESS] Redirecting client directly to Cobalt CDN!\);
             return res.redirect(302, cobaltData.url);
          }
          throw new Error("Could not resolve raw CDN URL.");
      }
    } catch (err: any)\);
    if(replaced !== code) {
       fs.writeFileSync(file, replaced);
       console.log('Update success');
    } else {
       console.log('Update regex failed no match during replace');
    }
} else {
    console.log('Regex did not match at all!');
}
