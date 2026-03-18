const fs = require('fs');
let file = 'server/routes/downloader.ts';
let code = fs.readFileSync(file, 'utf8');

const anchor = "DIRECT STREAM APPROACH FOR FULL VIDEOS";
const startIdx = code.indexOf(anchor);
if(startIdx > -1) {
   const blockStart = code.lastIndexOf("} else {", startIdx);
   const endIdx = code.indexOf("} catch (err: any) {", blockStart);
   
   if(blockStart > -1 && endIdx > -1) {
       const replacement = \} else {
          console.log("[Phase 3] FULL VIDEO OR PREVIEW -> Fetching raw CDN URL from proxy for bypass!");
          
          try {
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
                     console.log("? [SUCCESS] Redirecting client directly to Hetzner CDN!");
                     res.redirect(302, urls[0]);
                     return;
                 }
             }
          } catch(proxyErr) {
             console.log("[Phase 3] Hetzner proxy failed. Falling back to Cobalt public instance...");
          }
          
          // Fallback to qwkuns API (Cobalt) if Hetzner fails
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
             console.log("? [SUCCESS] Redirecting client directly to Cobalt CDN!");
             res.redirect(302, cobaltData.url);
             return;
          }
          throw new Error("Could not resolve raw CDN URL.");
      }
    \;
       
       let newCode = code.slice(0, blockStart) + replacement + code.slice(endIdx);
       fs.writeFileSync(file, newCode);
       console.log("Successfully replaced block!");
   } else {
       console.log("Could not find boundaries");
   }
} else {
    console.log("Anchor not found");
}
