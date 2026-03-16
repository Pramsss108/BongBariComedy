const yt = require('youtube-dl-exec');
console.log('🔄 Checking yt-dlp for updates...');
yt.exec('', { update: true })
  .then(x => {
    console.log(x.stdout || 'yt-dlp up to date.');
  })
  .catch(e => {
    console.error('Failed to update yt-dlp:', e.message);
  });
