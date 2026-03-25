const fs = require('fs');

const WORKER = 'https://ancient-king-7fa9.guitarguitarabhijit.workers.dev/';
const target = 'https://www.instagram.com/p/C-s7_vJvX1a/embed/captioned/';

async function testEmbed() {
  const res = await fetch(WORKER + '?url=' + encodeURIComponent(target));
  const text = await res.text();
  fs.writeFileSync('embed_output.html', text);
  console.log('Saved to embed_output.html');
}
testEmbed();
