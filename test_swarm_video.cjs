const url = 'https://www.instagram.com/reel/C-s7_vJvX1a/';
const WORKER_URL = 'https://ancient-king-7fa9.guitarguitarabhijit.workers.dev/';

async function extractVideo() {
  console.log('?? [SWARM EXTRACTOR TEST] Applying edge mobile apis...');
  try {
    const res = await fetch(WORKER_URL + '?url=' + encodeURIComponent(url) + '&mode=ig_api');
    console.log('Status: ' + res.status);
    const text = await res.text();
    
    if (text.includes('video_versions')) {
      const jsonRegex = /"video_versions":\[\{"type":\d+,"width":\d+,"height":\d+,"url":"([^"]+)"/g;
      const match = jsonRegex.exec(text);
      if(match && match[1]) {
        console.log('? Found video:', match[1].replace(/\\u0026/g, '&'));
        return;
      }
    }
    
    console.log('? Failed, HTML snippet: ' + text.substring(0,250));
  } catch (e) { console.log(e); }
}
extractVideo();
