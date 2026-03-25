const url = 'https://www.instagram.com/reel/C-s7_vJvX1a/';
const WORKER_URL = 'https://ancient-king-7fa9.guitarguitarabhijit.workers.dev/';

async function extractVideo() {
  console.log('?? [SWARM EXTRACTOR TEST] Routing through Cobalt Mirror via Swarm...');
  try {
    const cobaltUrl = 'https://cobalt-api.kwiateks.com'; // Public mirror
    const res = await fetch(WORKER_URL + '?url=' + encodeURIComponent(cobaltUrl + '/api/json'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ url: url })
    });
    console.log('Status: ' + res.status);
    const text = await res.text();
    console.log('Response: ' + text.substring(0,300));
  } catch (e) { console.log(e); }
}
extractVideo();
