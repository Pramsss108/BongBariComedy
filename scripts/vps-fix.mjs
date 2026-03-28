/**
 * BongBari Hetzner Fix — install node_modules on VPS + fix Caddy
 */
import { createRequire } from 'module';
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const require = createRequire(import.meta.url);
const { Client } = require('ssh2');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const VPS_IP   = '78.47.104.43';
const APP_DIR  = '/opt/bongbari';
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
      stream.on('close', (code) => (code !== 0 && !allowFail) ? reject(new Error(`Exit ${code}: ${cmd.slice(0,60)}`)) : resolve(out));
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
  // Keep --packages=external bundle (311KB), install node_modules on VPS instead
  console.log('\n📦 Building server bundle (packages=external)...');
  execSync(
    'npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist',
    { cwd: ROOT, stdio: 'inherit' }
  );
  const bundle = readFileSync(path.join(ROOT, 'dist/index.js'));
  console.log(`  ✅ Bundle: ${(bundle.length/1024).toFixed(1)} KB`);

  console.log(`\n🔌 Connecting to VPS ${VPS_IP}...`);
  const conn = await connect();
  console.log('  ✅ Connected!\n');

  try {
    // Upload new index.js
    console.log('📤 Uploading server bundle...');
    await uploadBuffer(conn, bundle, `${APP_DIR}/index.js`);

    // Upload package.json and run npm install on VPS
    console.log('\n📦 Uploading package.json and running npm install on VPS...');
    const pkgJson = readFileSync(path.join(ROOT, 'package.json'));
    await uploadBuffer(conn, pkgJson, `${APP_DIR}/package.json`);
    // npm install --production --ignore-scripts (skip native build steps)
    // This installs JS packages; native ones may warn but won't block startup
    console.log('  Running npm install on VPS (takes ~2 min)...');
    await runCmd(conn,
      `cd ${APP_DIR} && npm install --omit=dev --ignore-scripts --prefer-offline 2>&1 | tail -10`,
      true
    );

    // Fix Caddy — check what's wrong
    console.log('\n🔧 Fixing Caddy...');
    const caddyErr = await runCmd(conn, 'caddy validate --config /etc/caddy/Caddyfile 2>&1', true);
    console.log('Caddy validate:', caddyErr.slice(0, 200));

    // Try to start caddy directly (bypass systemctl)
    await runCmd(conn, 'pkill caddy 2>/dev/null; true', true);
    await runCmd(conn, 'sleep 1', true);

    // Start Caddy in background using nohup
    await runCmd(conn,
      'nohup caddy run --config /etc/caddy/Caddyfile > /var/log/caddy/caddy.log 2>&1 &',
      true
    );
    await runCmd(conn, 'sleep 3', true);
    const caddyPid = await runCmd(conn, 'pgrep caddy 2>/dev/null || echo MISSING', true);
    console.log('Caddy PID:', caddyPid.trim());

    // Restart the Node app
    console.log('\n🚀 Restarting BongBari app...');
    await runCmd(conn, `pm2 restart bongbari 2>&1 || pm2 start ${APP_DIR}/index.js --name bongbari 2>&1`, true);
    await runCmd(conn, 'sleep 5', true);
    await runCmd(conn, 'pm2 status 2>&1', true);
    await runCmd(conn, 'pm2 logs bongbari --lines 15 --nostream 2>&1', true);

    // Verify
    console.log('\n🔍 Verifying...');
    const node5k = await runCmd(conn, `curl -s --max-time 8 http://localhost:${APP_PORT}/api/version`, true);
    const caddy80 = await runCmd(conn, `curl -s --max-time 8 http://localhost:80/api/version`, true);
    const ports   = await runCmd(conn, 'ss -tlnp | grep -E ":80 |:5000 "', true);

    console.log('\nNode@5000:', node5k.trim() || 'NO RESPONSE');
    console.log('Caddy@80: ', caddy80.trim() || 'NO RESPONSE');
    console.log('Ports:    ', ports.trim() || 'none');

    if (node5k.includes('version')) {
      console.log('\n✅ Node server IS LIVE on port 5000!');
      console.log('Test: curl http://'+VPS_IP+':5000/api/version');
    }
    if (caddy80.includes('version')) {
      console.log('✅ Caddy proxy IS LIVE on port 80!');
    }

  } finally {
    conn.end();
  }
}

main().catch(e => { console.error('\n❌ Fix failed:', e.message); process.exit(1); });
