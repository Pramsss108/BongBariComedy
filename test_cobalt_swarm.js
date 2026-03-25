const WORKER = 'https://ancient-king-7fa9.guitarguitarabhijit.workers.dev/';
async function test() {
  console.log('Testing POST proxy against alternative cobalt...');
  const target = 'https://api.cobalt.tools/api/json';
  const res = await fetch(WORKER + '?url=' + encodeURIComponent(target), {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json', 
      'Accept': 'application/json' 
    },
    body: JSON.stringify({ url: 'https://www.instagram.com/reel/C-s7_vJvX1a/' })
  });
  console.log('Status:', res.status);
  console.log(await res.text());
}
test();
