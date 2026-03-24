const axios = require('axios');
async function test() {
  try {
    const res = await axios.post("https://co.wuk.sh/api/json", {
      url: "https://www.instagram.com/reel/DQUAq4IDd5n/"
    }, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      }
    });
    console.log(res.data);
  } catch(e) {
    console.log(e.message, e.response?.data);
  }
}
test();
