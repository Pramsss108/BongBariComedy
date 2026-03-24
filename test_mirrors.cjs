const axios = require('axios');
const urls = [
  "https://cobalt-api.kwiatev.cc",
  "https://cobalt.tu.fo",
  "https://api.cobalt.my.id",
  "https://a.cobalt.lol"
];
async function test() {
  for (const baseUrl of urls) {
    try {
      console.log('Testing', baseUrl);
      const res = await axios.post(`${baseUrl}/`, {
        url: "https://www.instagram.com/reel/DQUAq4IDd5n/"
      }, {
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        timeout: 5000
      });
      console.log("SUCCESS:", baseUrl, res.data.url ? "HAS URL" : "NO URL");
    } catch(e) {
      console.log("FAIL:", baseUrl, e.message, e.response?.data);
    }
  }
}
test();