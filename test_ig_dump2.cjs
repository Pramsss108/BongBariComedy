const { spawnSync } = require('child_process');
const args = ['--dump-json', 'https://www.instagram.com/reel/DQUAq4IDd5n/'];
const out = spawnSync('yt-dlp', [...args]);
if (out.stdout) { try { const data = JSON.parse(out.stdout.toString()); console.log('url:', !!data.url); console.log('acodec:', data.acodec); console.log('vcodec:', data.vcodec); } catch(e) { console.log('not json'); } } else { console.log(out.stderr.toString()) }
