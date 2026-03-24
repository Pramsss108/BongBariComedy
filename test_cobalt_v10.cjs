const axios = require('axios');
async function test() {
  try {
    const res = await axios.post("https://api.cobalt.tools/", {
      url: "https://www.instagram.com/reel/DQUAq4IDd5n/"
    }, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Origin': 'https://cobalt.tools',
        'Referer': 'https://cobalt.tools/'
      }
    });
    console.log("SUCCESS:", res.data);
  } catch(e) {
    console.log("FAIL:", e.message, e.response?.data);
  }
}
test();