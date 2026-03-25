import fs from 'fs';

async function testEmbed() {
  const targetUrl = 'https://www.instagram.com/p/C-s7_vJvX1a/embed/captioned/';
  const swarmUrl = 'https://ancient-king-7fa9.guitarguitarabhijit.workers.dev/?url=' + encodeURIComponent(targetUrl);
  
  console.log(`Fetching from Swarm: ${swarmUrl}`);
  try {
    const res = await fetch(swarmUrl, {
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    });
    console.log(`Status: ${res.status}`);
    const html = await res.text();
    fs.writeFileSync('embed_output.html', html);
    
    // Look for the video_url pattern in the HTML
    const videoUrlMatch = html.match(/"video_url":\s*"([^"]+)"/);
    if (videoUrlMatch) {
      // Instagram escapes slashes in JSON, e.g. \/
      let cleanUrl = videoUrlMatch[1].replace(/\\u0026/g, '&').replace(/\\\//g, '/');
      console.log('SUCCESS: Found Video URL ->', cleanUrl);
    } else {
      console.log('FAILED: No video_url match found in the embed HTML. Check embed_output.html');
      
      const configMatch = html.match(/window\.__additionalDataLoaded\([^,]+,([^<]+)\);/);
      if (configMatch) console.log('Found __additionalDataLoaded config block...');
      
      const sharedDataMatch = html.match(/window\._sharedData\s*=\s*({.+?});/);
      if (sharedDataMatch) console.log('Found _sharedData config block...');
    }
  } catch(e) {
    console.error('Error:', e);
  }
}

testEmbed();
