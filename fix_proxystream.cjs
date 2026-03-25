const fs = require('fs');
let code = fs.readFileSync('server/routes/downloader.ts', 'utf8');

const startIndex = code.indexOf('// 3. Fallback: If cache completely misses');
const endIndex = code.indexOf('// 4. Send response');

if (startIndex === -1 || endIndex === -1) {
    console.log("Could not find start/end indices.");
    process.exit(1);
}

const replacement = `// 3. Fallback: If cache completely misses, fetch it via proxy
  if (!bestStreamUrl) {
      console.log(\`[Phase 0] Requesting fast PREVIEW proxy extraction for: \${url}\`);
      const isYT = validated.url.includes("youtube.com") || validated.url.includes("youtu.be");
      const isMeta = validated.url.includes("instagram.com") || validated.url.includes("facebook.com") || validated.url.includes("fb.watch");

      // ── PROVEN METHOD: Route through Hetzner VPS (clean IP, not banned by BotGuard) ──
      // Always try Hetzner first unless explicitly forced to skip it (e.g., layer2 or layer3)
      if ((!forceEngine) || forceEngine === "layer1") {
          try {
              const vpsNode = getNextPreviewNode();
              console.log(\`[Layer 1.5] PREVIEW Route: Requesting Hetzner VPS \${vpsNode}\`);
              const vpsRes = await axios.post(vpsNode, { url: validated.url }, {
                  timeout: 10000,
                  headers: { 'Content-Type': 'application/json' }
              });
              if (vpsRes.data && vpsRes.data.url) {
                  bestStreamUrl = vpsRes.data.url;
                  console.log(\`[Layer 1.5] ✅ Hetzner preview returned CDN URL instantly!\`);
              }
          } catch(vpsErr: any) {
              console.warn(\`[Layer 1.5] Hetzner preview failed: \${vpsErr.message}. Falling back...\`);
          }
      }

      // LAYER 2 GHOST NODE FALLBACK (META ONLY)
      if (!bestStreamUrl && isMeta && ((!forceEngine) || forceEngine === "layer2" || forceEngine === "layer1")) {
           console.log(\`[Layer 2] PREVIEW Route: Meta detected. Connecting Ghost Layer...\`);
           try {
              const ghostMirrors = [
                  "https://cobalt.tuxlu.nl/",
                  "https://api.cobalt.my.id/",
                  "https://api.cobalt.tools/"
              ];
              for (const mirror of ghostMirrors) {
                  try {
                      const proxyAxios = axios.create({
                          headers: {
                              'Accept': 'application/json',
                              'Content-Type': 'application/json',
                              'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
                              'Origin': new URL(mirror).origin,
                              'Referer': new URL(mirror).origin
                          },
                          timeout: 4000
                      });
                      const mRes = await proxyAxios.post(mirror, { url: validated.url, vQuality: "480" });
                      if (mRes.data && mRes.data.url) {
                          bestStreamUrl = mRes.data.url;
                          console.log(\`[Layer 2] ✅ Ghost Mirror returned preview URL \${bestStreamUrl.substring(0,40)}...\`);
                          break;
                      }
                  } catch(e) {}
              }
           } catch(e) {}
      }

      // LAYER 3 (YT-DLP NATIVE)
      if (!bestStreamUrl && ((!forceEngine) || forceEngine === "layer3" || forceEngine === "layer2" || forceEngine === "layer1")) {
          // If we exhaust fast APIs or explicit Layer 3 forced...
          console.log(\`[Layer 3] PREVIEW Route: Falling back to executeYtDlpExtract...\`);
          try {
              if (isYT) {
                  const { visitorData, poToken } = await getPoToken();
                  const info = await ytdl.getInfo(validated.url, {
                      requestOptions: {
                          headers: {
                              'Cookie': \`po_token=web+\${poToken}; visitor_data=\${visitorData}\`
                          }
                      }
                  });
                  const mergedFormats = info.formats.filter((f: any) => f.hasVideo && f.hasAudio);
                  let selectedFormat = mergedFormats.sort((a: any, b: any) => (b.height || 0) - (a.height || 0)).find((f: any) => (f.height || 0) <= qStr);
                  if (!selectedFormat) selectedFormat = ytdl.chooseFormat(mergedFormats, { quality: 'highest' });
                  if (selectedFormat && selectedFormat.url) bestStreamUrl = selectedFormat.url;
              } else {
                  // Meta / other extract via proxy
                  const data = await executeYtDlpExtract(url, ["--format", "b"]);
                  bestStreamUrl = data.url || (data.requested_downloads && data.requested_downloads[0]?.url);
              }
          } catch(e: any) {
              console.error("[Layer 3] yt-dlp fallback also failed:", e.message);
          }
      }
  }

  `;

code = code.substring(0, startIndex) + replacement + code.substring(endIndex);
fs.writeFileSync('server/routes/downloader.ts', code);
console.log("Replaced Proxy Stream Logic with robust Layering!");
