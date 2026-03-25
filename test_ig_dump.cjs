const { spawnSync } = require('child_process');
const proxy = '--proxy';
const proxy2 = 'http://c3vG4q3e:wJ1L2l7y@185.199.229.156:7492';
const args = ['--dump-json', 'https://www.instagram.com/reel/DQUAq4IDd5n/'];
const out = spawnSync('yt-dlp', [proxy, proxy2, ...args]);
console.log('stderr:', out.stderr.toString());
if (out.stdout) { try { const data = JSON.parse(out.stdout.toString()); console.log('has requested_formats?', !!data.requested_formats); console.log('formats count?', data.formats ? data.formats.length : 0); console.log('url acodec?', data.acodec); console.log('url vcodec?', data.vcodec); } catch(e) { console.log(e); } }
