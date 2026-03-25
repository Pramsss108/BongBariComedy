const mirrors = [
  'https://co.wuk.sh',
  'https://cobalt.kwiateks.com',
  'https://api.cobalt.best',
  'https://cobalt.kheina.com',
  'https://cobalt-api.kwiateks.com'
];
async function check() {
  for (const m of mirrors) {
    try {
      const res = await fetch(m, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ url: 'https://www.instagram.com/reel/C-s7_vJvX1a/' })
      });
      console.log(m, ' -> ', res.status, await res.text().then(t => t.substring(0, 100)));
    } catch(e) {
      console.log(m, ' -> ERROR');
    }
  }
}
check();
