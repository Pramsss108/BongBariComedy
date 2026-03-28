// Quick VPS health check
const { Client } = require('ssh2');
const c = new Client();
c.on('ready', () => {
  console.log('SSH OK');
  const cmds = [
    'pm2 list',
    'curl -s --max-time 5 http://localhost:5000/api/version',
    'curl -s --max-time 5 http://localhost:80/api/version',
    'curl -s --max-time 5 http://localhost:5000/api/share/gofile-health',
    'ss -tlpn | grep -E "80|443|5000"',
    'pm2 logs bongbari --err --lines 10 --nostream 2>&1',
    'cat /etc/caddy/Caddyfile'
  ];
  let i = 0;
  function next() {
    if (i >= cmds.length) { c.end(); return; }
    const cmd = cmds[i++];
    console.log('\n>>> ' + cmd);
    c.exec(cmd, (e, s) => {
      if (e) { console.log('ERR:', e.message); next(); return; }
      let o = '';
      s.on('data', d => { o += d; });
      s.stderr.on('data', d => { o += d; });
      s.on('close', () => { console.log(o); next(); });
    });
  }
  next();
}).connect({ host: '78.47.104.43', port: 22, username: 'root', password: '4rrcFpxhEXAj' });
