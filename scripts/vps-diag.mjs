import { createRequire } from 'module';
import { fileURLToPath } from 'url';
const require = createRequire(import.meta.url);
const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', async () => {
  const run = (cmd, fail=true) => new Promise((res) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return res('ERROR: ' + err.message);
      let o = '';
      stream.on('data', d => o += d);
      stream.stderr.on('data', d => o += d);
      stream.on('close', () => res(o.trim()));
    });
  });

  console.log('\n=== PM2 Status ===');
  console.log(await run('pm2 status 2>&1'));
  console.log('\n=== App Logs (last 30 lines) ===');
  console.log(await run('pm2 logs bongbari --lines 30 --nostream 2>&1'));
  console.log('\n=== Direct Node port 5000 ===');
  console.log(await run('curl -s --max-time 5 http://localhost:5000/api/version 2>&1'));
  console.log('\n=== Caddy status ===');
  console.log(await run('systemctl is-active caddy && systemctl status caddy --no-pager | head -15 2>&1'));
  console.log('\n=== Listening ports ===');
  console.log(await run('ss -tlnp 2>&1 | head -20'));
  console.log('\n=== UFW firewall ===');
  console.log(await run('ufw status 2>&1'));
  console.log('\n=== Caddy test port 80 ===');
  console.log(await run('curl -s --max-time 5 http://localhost:80/api/version 2>&1'));
  
  conn.end();
  process.exit(0);
});
conn.on('error', e => { console.error('SSH error:', e.message); process.exit(1); });
conn.connect({ host: '78.47.104.43', port: 22, username: 'root', password: '4rrcFpxhEXAj', readyTimeout: 20000 });
