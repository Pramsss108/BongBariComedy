const path = require('path');
const p1 = path.join('client/public', '/models/foo.json');
console.log('p1:', p1);

const p2 = path.join(__dirname, 'client/public', '/models/foo.json');
console.log('p2:', p2);
