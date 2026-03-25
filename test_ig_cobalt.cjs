const axios = require('axios');
async function test() {
    try {
        console.log('Testing Instagram...');
        const igReq = await axios.post('http://78.47.104.43:9000/', {
            url: 'https://www.instagram.com/reel/DQUAq4IDd5n/'
        }, { headers: { 'Accept': 'application/json' } });
        console.log('IG Response Vanilla:', typeof igReq.data.url, igReq.data.status);
        
        console.log('Testing IG h264...');
        const igReq2 = await axios.post('http://78.47.104.43:9000/', {
            url: 'https://www.instagram.com/reel/DQUAq4IDd5n/',
            vCodec: 'h264'
        }, { headers: { 'Accept': 'application/json' } });
        console.log('IG Response h264:', typeof igReq2.data.url, igReq2.data.status);

        console.log('Testing IG 720p...');
        const igReq3 = await axios.post('http://78.47.104.43:9000/', {
            url: 'https://www.instagram.com/reel/DQUAq4IDd5n/',
            vQuality: '720'
        }, { headers: { 'Accept': 'application/json' } });
        console.log('IG Response 720p:', typeof igReq3.data.url, igReq3.data.status);
    } catch(e) {
        console.error('Error:', e.response?.data || e.message);
    }
}
test();