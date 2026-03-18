const http = require('http'); 
http.get('http://localhost:5000/api/downloader/token?url=https://www.youtube.com/watch?v=l6aP9dZfSFE', { headers: { 'cookie': 'admin_session=test' } }, res => {
  let b=''; res.on('data', d=>b+=d); res.on('end', () => {
    let t = JSON.parse(b).token;
    console.log('Token:', t);
    http.get('http://localhost:5000/api/downloader/proxy-stream?url=https://www.youtube.com/watch?v=l6aP9dZfSFE&format=mp4-480&mode=stream&token='+t, res2 => {
        console.log('Proxy statusCode:', res2.statusCode); 
        res2.on('data', d=>{ console.log('Chnk length:', d.length); res2.destroy(); }) 
    }); 
  }); 
});
