const { execSync } = require('child_process');

function generateTokenIsolated() {
  const code = `
    const yt = require('youtube-po-token-generator');
    yt.generate().then(res => console.log(JSON.stringify(res))).catch(err => { console.error(err.message); process.exit(1); });
  `;
  const result = execSync('node -e "require(\'youtube-po-token-generator\').generate().then(res => console.log(JSON.stringify(res)))"', { encoding: 'utf-8' });
  return JSON.parse(result);
}

try {
  const before = process.memoryUsage();
  console.time('gen');
  const tokens = generateTokenIsolated();
  console.timeEnd('gen');
  console.log('Result:', tokens);
  const after = process.memoryUsage();
  console.log('Heap growth mb:', Math.round((after.heapUsed - before.heapUsed)/1024/1024));
} catch (e) {
  console.error("Failed:", e.message);
}