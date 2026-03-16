const fs = require('fs');
const text = fs.readFileSync('body.html', 'utf8');
const regex = /href="([^"]+)"/g;
let match;
while ((match = regex.exec(text)) !== null) {
  const url = match[1];
  if (url.includes('http')) {
    console.log(decodeURIComponent(url));
  }
}
