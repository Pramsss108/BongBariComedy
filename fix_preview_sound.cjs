const fs = require('fs');
let code = fs.readFileSync('server/routes/downloader.ts', 'utf8');

code = code.replace(`const vpsRes = await axios.post(vpsNode, { url: validated.url }, {
                  timeout: 10000`, `const vpsRes = await axios.post(vpsNode, { url: validated.url, vQuality: "720", vCodec: "h264" }, {
                  timeout: 10000`);

code = code.replace(`const mRes = await proxyAxios.post(mirror, { url: validated.url, vQuality: "480" });`, `const mRes = await proxyAxios.post(mirror, { url: validated.url, vQuality: "720", vCodec: "h264" });`);

fs.writeFileSync('server/routes/downloader.ts', code);
console.log("Fixed preview Cobalt payload!");
