const fs = require('fs');
let code = fs.readFileSync('server/routes/downloader.ts', 'utf8');

const oldCode = `              const premuxed = rawFormats.filter((f: any) =>
                  f.ext === 'mp4' && f.acodec && f.acodec !== 'none' && f.vcodec && f.vcodec !== 'none' && f.url && f.url.startsWith('http') && !f.url.includes('.m3u8')
              );

              if (premuxed.length > 0) {
                  bestStreamUrl = premuxed[0].url; // fallback to worst if no match
                  for (const f of premuxed) {
                      const minDim = Math.min(f.height || 0, f.width || 0);
                      if (minDim > 0 && minDim <= qStr) bestStreamUrl = f.url;
                  }
              }

              // Universal fallback: any playable video URL
              if (!bestStreamUrl) {
                  const anyValidUrl = rawFormats.find((f: any) =>
                      f.vcodec && f.vcodec !== 'none' && f.url && f.url.startsWith('http') && !f.url.includes('manifest') && !f.url.includes('.m3u8')
                  );
                  if (anyValidUrl) bestStreamUrl = anyValidUrl.url;
              }`;

const newCode = `              // Best pre-muxed mp4 formats
              const premuxed = rawFormats.filter((f: any) => {
                  if (!f.url || !f.url.startsWith('http') || f.url.includes('.m3u8') || f.url.includes('manifest')) return false;
                  
                  // For Meta/Instagram, "2" or "0" is often the native pre-muxed format. We must trust it.
                  if (url.includes('instagram.com') || url.includes('facebook.com')) {
                      if (f.format_id === '2' || f.format_id === '0') return true;
                  }
                  
                  return f.ext === 'mp4' && 
                         f.acodec && f.acodec !== 'none' && 
                         f.vcodec && f.vcodec !== 'none';
              });

              if (premuxed.length > 0) {
                  bestStreamUrl = premuxed[0].url; // fallback to worst if no match
                  
                  // For Instagram specifically, prioritize format_id 2 or 0 directly to guarantee audio
                  const igPremium = premuxed.find((f: any) => f.format_id === '2' || f.format_id === '0');
                  if ((url.includes('instagram.com') || url.includes('facebook.com')) && igPremium) {
                      bestStreamUrl = igPremium.url;
                  } else {
                      for (const f of premuxed) {
                          const minDim = Math.min(f.height || 0, f.width || 0);
                          if (minDim > 0 && minDim <= qStr && f.acodec && f.acodec !== 'none') bestStreamUrl = f.url;
                      }
                  }
              }

              // Universal fallback: any playable video URL
              if (!bestStreamUrl) {
                  const anyValidUrl = rawFormats.find((f: any) =>
                      f.vcodec && f.vcodec !== 'none' && f.url && f.url.startsWith('http') && !f.url.includes('manifest') && !f.url.includes('.m3u8')
                  );
                  if (anyValidUrl) bestStreamUrl = anyValidUrl.url;
              }`;

code = code.replace(oldCode, newCode);
fs.writeFileSync('server/routes/downloader.ts', code);
console.log('Fixed Instagram specific audio formats in proxy-stream layer 3 cache filter');