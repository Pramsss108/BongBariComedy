/**
 * BongBari VPS Fix 2 — fix Caddy syntax + npm install with all deps
 */
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const { Client } = require('ssh2');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const VPS_IP  = '78.47.104.43';
const APP_DIR = '/opt/bongbari';
const APP_PORT = 5000;

function connect() {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    conn.on('ready', () => resolve(conn));
    conn.on('error', reject);
    conn.connect({ host: VPS_IP, port: 22, username: 'root', password: '4rrcFpxhEXAj', readyTimeout: 25000, keepaliveInterval: 15000 });
  });
}

function runCmd(conn, cmd, allowFail = false) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return allowFail ? resolve('') : reject(err);
      let out = '';
      stream.on('data', d => { const s = d.toString(); process.stdout.write(s); out += s; });
      stream.stderr.on('data', d => { const s = d.toString(); process.stderr.write(s); out += s; });
      stream.on('close', (code) => (code !== 0 && !allowFail) ? reject(new Error(`Exit ${code}`)) : resolve(out));
    });
  });
}

function uploadBuffer(conn, content, remotePath) {
  return new Promise((resolve, reject) => {
    conn.sftp((err, sftp) => {
      if (err) return reject(err);
      const buf = Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf8');
      const ws = sftp.createWriteStream(remotePath);
      ws.on('close', () => { sftp.end(); console.log(`  ✅ → ${remotePath}`); resolve(); });
      ws.on('error', reject);
      ws.end(buf);
    });
  });
}

async function main() {
  console.log(`\n🔌 Connecting to ${VPS_IP}...`);
  const conn = await connect();
  console.log('  ✅ Connected!\n');

  try {
    // Fix 1: npm install WITH all deps (no --omit=dev, no --ignore-scripts)
    console.log('📦 [1/3] Running full npm install on VPS...');
    await runCmd(conn,
      `cd ${APP_DIR} && npm install --prefer-offline 2>&1 | tail -8`,
      true
    );

    // Fix 2: correct Caddyfile (no inline blocks)
    console.log('\n📝 [2/3] Writing correct Caddyfile...');
    const caddyfile = `:80 {
    handle /api/share/upload {
        request_body {
            max_size 10GB
        }
        header Access-Control-Allow-Origin "*"
        header Access-Control-Allow-Methods "POST, OPTIONS"
        header Access-Control-Allow-Headers "*"
        @options method OPTIONS
        respond @options 204
        reverse_proxy localhost:${APP_PORT} {
            transport http {
                read_timeout 660s
                write_timeout 660s
            }
            flush_interval -1
        }
    }
    handle /api/* {
        header Access-Control-Allow-Origin "*"
        header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS"
        header Access-Control-Allow-Headers "*"
        @options method OPTIONS
        respond @options 204
        reverse_proxy localhost:${APP_PORT}
    }
    handle /health {
        respond "OK" 200
    }
}
`;
    await uploadBuffer(conn, caddyfile, '/etc/caddy/Caddyfile');

    // Validate and start Caddy
    const caddyVal = await runCmd(conn, 'caddy validate --config /etc/caddy/Caddyfile 2>&1', true);
    if (caddyVal.includes('Valid')) {
      console.log('  ✅ Caddyfile valid');
    } else {
      console.log('  Caddy validate:', caddyVal.slice(0, 200));
    }

    await runCmd(conn, 'pkill -f "caddy run" 2>/dev/null; sleep 1; true', true);
    await runCmd(conn,
      'nohup caddy run --config /etc/caddy/Caddyfile --adapter caddyfile > /var/log/caddy/caddy.log 2>&1 &',
      true
    );
    await runCmd(conn, 'sleep 2', true);
    const caddyPid = await runCmd(conn, 'pgrep -x caddy 2>/dev/null || echo MISSING', true);
    console.log('  Caddy PID:', caddyPid.trim());

    // Fix 3: Restart app
    console.log('\n🚀 [3/3] Restarting BongBari...');
    await runCmd(conn, `pm2 restart bongbari 2>&1`, true);
    await runCmd(conn, 'sleep 6', true);

    // Check logs for errors
    const logs = await runCmd(conn, 'pm2 logs bongbari --lines 20 --nostream 2>&1', true);
    const hasError = logs.includes('ERR_MODULE_NOT_FOUND') || logs.includes('Cannot find');
    if (hasError) {
      // Extract which module is missing
      const match = logs.match(/Cannot find (?:package|module) '([^']+)'/);
      if (match) {
        console.log(`  ⚠️ Still missing: ${match[1]} — installing directly...`);
        await runCmd(conn, `cd ${APP_DIR} && npm install --save ${match[1]} 2>&1 | tail -5`, true);
        await runCmd(conn, 'pm2 restart bongbari 2>&1', true);
        await runCmd(conn, 'sleep 5', true);
      }
    }

    // Final verify
    console.log('\n🔍 Verifying...');
    const node5k = await runCmd(conn, `curl -s --max-time 8 http://localhost:${APP_PORT}/api/version`, true);
    const caddy80 = await runCmd(conn, `curl -s --max-time 8 http://localhost:80/api/version`, true);

    console.log('\nNode@5000:', node5k.trim() || 'NO RESPONSE');
    console.log('Caddy@80: ', caddy80.trim() || 'NO RESPONSE');

    if (node5k.includes('version')) {
      console.log('\n✅ BongBari server is LIVE on VPS!');
      console.log(`Public URL: http://${VPS_IP}:${APP_PORT}/api/version`);
    }
    if (caddy80.includes('version')) {
      console.log(`✅ Caddy proxy LIVE: http://${VPS_IP}/api/version`);
    }
    if (!node5k.includes('version') && !caddy80.includes('version')) {
      console.log('\n⚠️ Still not responding — check logs above');
      const finalLogs = await runCmd(conn, 'pm2 logs bongbari --lines 25 --nostream 2>&1', true);
      console.log(finalLogs);
    }

  } finally {
    conn.end();
  }
}

main().catch(e => { console.error('\n❌ Failed:', e.message); process.exit(1); });
