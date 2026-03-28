// Quick VPS upload endpoint test
const { Client } = require('ssh2');
const c = new Client();
c.on('ready', () => {
  // Create a 200KB test file then curl the upload endpoint
  const cmd = [
    'dd if=/dev/urandom of=/tmp/test_upload.bin bs=1k count=200 2>/dev/null',
    'curl -s -X POST http://localhost:5000/api/share/upload',
    '  -F "file=@/tmp/test_upload.bin;type=application/octet-stream"',
    '  -m 60',
    '  2>&1 | head -c 500',
    '; rm -f /tmp/test_upload.bin'
  ].join(' ');

  c.exec(cmd, (err, s) => {
    let o = '';
    s.on('data', d => o += d);
    s.stderr.on('data', d => o += d);
    s.on('close', () => { console.log('RESULT:', o); c.end(); });
  });
}).connect({ host: '78.47.104.43', port: 22, username: 'root', password: '4rrcFpxhEXAj' });
c.on('error', e => console.error('SSH error:', e.message));
