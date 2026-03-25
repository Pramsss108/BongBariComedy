const fs = require('fs');
let code = fs.readFileSync('server/routes/downloader.ts', 'utf8');

const oldCode2 = `        const premuxed = info.formats.filter((f: any) =>
              f.ext === 'mp4' && f.acodec && f.acodec !== 'none' &&
              f.vcodec && f.vcodec !== 'none' && f.url && f.url.startsWith('http') &&
              !f.url.includes('.m3u8')
          );`;

const newCode2 = `        const premuxed = info.formats.filter((f: any) => {
              if (!f.url || !f.url.startsWith('http') || f.url.includes('.m3u8') || f.url.includes('manifest')) return false;
              if (url.includes('instagram.com') || url.includes('facebook.com')) {
                  if (f.format_id === '2' || f.format_id === '0') return true;
              }
              return f.ext === 'mp4' && f.acodec && f.acodec !== 'none' && f.vcodec && f.vcodec !== 'none';
          });`;

code = code.replace(oldCode2, newCode2);
fs.writeFileSync('server/routes/downloader.ts', code);
console.log('Fixed second instance');