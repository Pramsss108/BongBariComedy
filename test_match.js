const { download } = require('youtube-po-token-generator/lib/utils');
download('https://www.youtube.com/embed/dQw4w9WgXcQ').then(d => {
  const m = d.match(/"visitorData":"([^"]+)/);
  if (!m) return console.log('no match');
  console.log('length:', m[1].length);
  console.log('val:', m[1]);
});
