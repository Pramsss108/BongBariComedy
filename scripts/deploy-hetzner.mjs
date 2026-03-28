/**
 * BongBari Hetzner Deploy — runs each command in a separate exec call
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
const VPS_USER = 'root';
const VPS_PASS = process.env.VPS_PASS || '4rrcFpxhEXAj';
const APP_DIR  = '/opt/bongbari';
const APP_PORT = 5000;

function loadEnvFile(filePath) {
  const vars = {};
  if (!existsSync(filePath)) return vars;
  for (const line of readFileSync(filePath, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq < 0) continue;
    vars[t.slice(0, eq).trim()] = t.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
  }
  return vars;
}

const envVars = {
  ...loadEnvFile(path.join(ROOT, '.env')),
  ...loadEnvFile(path.join(ROOT, 'server', '.env')),
  NODE_ENV: 'production',
  PORT: String(APP_PORT),
};

function connect() {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    conn.on('ready', () => resolve(conn));
    conn.on('error', reject);
    conn.connect({ host: VPS_IP, port: 22, username: VPS_USER, password: VPS_PASS, readyTimeout: 25000, keepaliveInterval: 10000 });
  });
}

function runCmd(conn, cmd, allowFail = false) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return allowFail ? resolve('') : reject(err);
      let out = '';
      stream.on('data', d => { const s = d.toString(); process.stdout.write(s); out += s; });
      stream.stderr.on('data', d => { const s = d.toString(); process.stderr.write(s); out += s; });
      stream.on('close', (code) => {
        if (code !== 0 && !allowFail) {
          reject(new Error(`Exit ${code}: ${cmd.slice(0, 60)}`));
        } else {
          resolve(out);
        }
      });
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
  // 1. Build server bundle
  console.log('\n📦 Building server bundle...');
  execSync('npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist', { cwd: ROOT, stdio: 'inherit' });
  const bundle = readFileSync(path.join(ROOT, 'dist/index.js'));
  console.log(`  ✅ Bundle: ${(bundle.length/1024).toFixed(1)} KB`);

  // 2. Connect
  console.log(`\n🔌 Connecting to ${VPS_IP}...`);
  const conn = await connect();
  console.log('  ✅ Connected!\n');

  try {
    // 3. apt update
    console.log('📦 [1/6] apt update...');
    await runCmd(conn, 'DEBIAN_FRONTEND=noninteractive apt-get update -qq 2>&1 | tail -2', true);

    // 4. Node.js
    console.log('\n⚡ [2/6] Node.js 20...');
    const nv = await runCmd(conn, 'node --version 2>/dev/null || echo MISSING', true);
    if (!nv.includes('v20') && !nv.includes('v22')) {
      console.log('  Installing Node.js 20...');
      await runCmd(conn, 'curl -fsSL https://deb.nodesource.com/setup_20.x | bash - 2>&1 | tail -3', true);
      await runCmd(conn, 'DEBIAN_FRONTEND=noninteractive apt-get install -y nodejs 2>&1 | tail -3', true);
    }
    await runCmd(conn, 'node --version');

    // 5. PM2
    console.log('\n⚡ [3/6] PM2...');
    await runCmd(conn, 'npm list -g pm2 2>/dev/null | grep -q pm2 || npm install -g pm2 --quiet 2>&1 | tail -2', true);
    await runCmd(conn, 'pm2 --version');

    // 6. Caddy
    console.log('\n⚡ [4/6] Caddy...');
    const cv = await runCmd(conn, 'which caddy 2>/dev/null || echo MISSING', true);
    if (cv.includes('MISSING')) {
      await runCmd(conn, "curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg", true);
      await runCmd(conn, "curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list", true);
      await runCmd(conn, 'apt-get update -qq && apt-get install -y caddy 2>&1 | tail -3', true);
    }
    await runCmd(conn, 'caddy version', true);

    // 7. Setup dirs + upload
    console.log('\n📤 [5/6] Uploading files...');
    await runCmd(conn, `mkdir -p ${APP_DIR}/tmp/bongshare /var/log/caddy`, true);

    await uploadBuffer(conn, bundle, `${APP_DIR}/index.js`);
    await uploadBuffer(conn, JSON.stringify({ type: 'module', name: 'bongbari', version: '1.0.0' }), `${APP_DIR}/package.json`);

    const envContent = Object.entries(envVars)
      .filter(([k]) => k && !['PATH','HOME','USER'].includes(k))
      .map(([k, v]) => `${k}=${v}`).join('\n') + '\n';
    await uploadBuffer(conn, envContent, `${APP_DIR}/.env`);

    const caddyfile = `:80 {
    handle /api/share/upload {
        request_body { max_size 10GB }
        header Access-Control-Allow-Origin "*"
        header Access-Control-Allow-Methods "POST, OPTIONS"
        header Access-Control-Allow-Headers "*"
        @options method OPTIONS
        respond @options 204
        reverse_proxy localhost:${APP_PORT} {
            transport http { read_timeout 660s; write_timeout 660s }
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

    // 8. Start services
    console.log('\n🚀 [6/6] Starting services...');
    await runCmd(conn, 'systemctl reload caddy 2>/dev/null || systemctl restart caddy 2>/dev/null', true);
    await runCmd(conn, `pm2 stop bongbari 2>/dev/null; pm2 delete bongbari 2>/dev/null; true`, true);
    await runCmd(conn, `cd ${APP_DIR} && NODE_ENV=production PORT=${APP_PORT} pm2 start index.js --name bongbari`, true);
    await runCmd(conn, 'sleep 4 && pm2 status', true);
    await runCmd(conn, 'pm2 save 2>/dev/null', true);

    // 9. Verify
    console.log('\n🔍 Verifying...');
    const direct = await runCmd(conn, `curl -s http://localhost:${APP_PORT}/api/version`, true);
    const caddy  = await runCmd(conn, `curl -s http://localhost/api/version`, true);

    console.log('\n' + '='.repeat(55));
    console.log('✅  HETZNER DEPLOY COMPLETE  ✅');
    console.log('='.repeat(55));
    console.log(`\nNode direct : http://${VPS_IP}:${APP_PORT}/api/version`);
    console.log(`Caddy (80)  : http://${VPS_IP}/api/version`);
    console.log(`GoFile check: http://${VPS_IP}/api/share/gofile-health`);
    if (direct.includes('version') || caddy.includes('version')) {
      console.log('\n🟢 SERVER IS LIVE!');
    } else {
      console.log('\n🟡 Server starting — wait 10s then curl http://'+VPS_IP+'/api/version');
    }

  } finally {
    conn.end();
  }
}

main().catch(e => { console.error('\n❌ Deploy failed:', e.message); process.exit(1); });
