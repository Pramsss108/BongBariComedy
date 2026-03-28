/**
 * vps-fix3.mjs — Fix /opt/dist/public missing + verify server live
 * Root cause: esbuild bundle at /opt/bongbari/index.js uses import.meta.dirname (/opt/bongbari)
 *             then resolves "../dist/public" = /opt/dist/public which doesn't exist.
 * Fix: mkdir /opt/dist/public with stub index.html, restart PM2, verify.
 */
import { Client } from 'ssh2';
import { readFileSync } from 'fs';

const VPS = { host: '78.47.104.43', port: 22, username: 'root', password: '4rrcFpxhEXAj' };

function runCmd(conn, cmd, allowFail = false) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) { if (allowFail) return resolve(''); return reject(err); }
      let out = '';
      stream.on('data', d => { out += d; process.stdout.write(d.toString()); });
      stream.stderr.on('data', d => { out += d; process.stderr.write(d.toString()); });
      stream.on('close', (code) => {
        if (code !== 0 && !allowFail) reject(new Error(`Exit ${code}: ${cmd}`));
        else resolve(out.trim());
      });
    });
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const conn = new Client();
  await new Promise((res, rej) => {
    conn.on('ready', res).on('error', rej).connect(VPS);
  });
  console.log('\n✅ Connected!\n');

  // Step 1: Create stub dist/public at the path the bundle expects (/opt/dist/public)
  console.log('📁 [1/5] Creating /opt/dist/public stub...');
  await runCmd(conn, `mkdir -p /opt/dist/public && cat > /opt/dist/public/index.html << 'EOF'\n<!DOCTYPE html><html><body><h1>BongBari API Server</h1><p>API is running. Frontend at www.bongbari.com</p></body></html>\nEOF`);
  console.log('\n   ✅ /opt/dist/public created');

  // Step 2: Check xml2js is actually installed
  console.log('\n🔍 [2/5] Verifying xml2js in node_modules...');
  const xmljs = await runCmd(conn, `ls /opt/bongbari/node_modules | grep xml2js || echo "MISSING"`, true);
  if (xmljs.includes('MISSING')) {
    console.log('\n   ⚠️ xml2js missing, installing...');
    await runCmd(conn, `cd /opt/bongbari && npm install xml2js --save 2>&1 | tail -5`, true);
  } else {
    console.log('\n   ✅ xml2js present');
  }

  // Step 3: Check for other missing modules by looking at last crash
  console.log('\n📋 [3/5] Checking last PM2 error log...');
  const errLog = await runCmd(conn, `pm2 logs bongbari --err --lines 30 --nostream 2>&1 | grep ERR_MODULE_NOT_FOUND | head -5`, true);
  if (errLog.includes('ERR_MODULE_NOT_FOUND')) {
    // extract missing package name
    const matches = errLog.match(/Cannot find package '([^']+)'/g) || [];
    const missing = [...new Set(matches.map(m => m.replace("Cannot find package '", '').replace("'", '')))];
    if (missing.length > 0) {
      console.log(`\n   ⚠️ Still missing: ${missing.join(', ')} — installing...`);
      await runCmd(conn, `cd /opt/bongbari && npm install ${missing.join(' ')} --save 2>&1 | tail -5`, true);
    }
  } else {
    console.log('\n   ✅ No module-not-found errors');
  }

  // Step 4: Restart PM2 + wait
  console.log('\n🚀 [4/5] Restarting PM2...');
  await runCmd(conn, `pm2 restart bongbari && sleep 4`);

  // Check PM2 status
  await runCmd(conn, `pm2 list`);
  await sleep(2000);

  // Step 5: Verify
  console.log('\n\n🔍 [5/5] Verifying endpoints...');

  const node = await runCmd(conn, `curl -s --max-time 5 http://localhost:5000/api/version || echo "NO_RESPONSE"`, true);
  const caddy = await runCmd(conn, `curl -s --max-time 5 http://localhost:80/api/version || echo "NO_RESPONSE"`, true);

  console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Node@5000:  ${node.includes('NO_RESPONSE') ? '❌ NO RESPONSE' : '✅ ' + node.slice(0, 100)}`);
  console.log(`Caddy@80:   ${caddy.includes('NO_RESPONSE') ? '❌ NO RESPONSE' : '✅ ' + caddy.slice(0, 100)}`);

  if (node.includes('NO_RESPONSE')) {
    console.log('\n⚠️ Server still not responding — checking fresh logs...');
    await runCmd(conn, `pm2 logs bongbari --lines 35 --nostream 2>&1`, true);
  } else {
    console.log('\n🎉 Server is LIVE on port 5000!');

    // Check share route
    const share = await runCmd(conn, `curl -s --max-time 5 http://localhost:5000/api/share/gofile-health || echo "NO_RESPONSE"`, true);
    console.log(`Share health: ${share.includes('NO_RESPONSE') ? '❌ NO RESPONSE' : '✅ ' + share.slice(0, 150)}`);

    if (!caddy.includes('NO_RESPONSE')) {
      console.log('\n🎉 Caddy is LIVE on port 80! External access ready.');
      // Test external
      const ext = await runCmd(conn, `curl -s --max-time 8 http://78.47.104.43/api/version || echo "NO_RESPONSE"`, true);
      console.log(`External:   ${ext.includes('NO_RESPONSE') ? '❌ NO RESPONSE' : '✅ ' + ext.slice(0, 100)}`);
    } else {
      console.log('\n⚠️ Caddy not responding on 80 — checking caddy status...');
      await runCmd(conn, `systemctl status caddy --no-pager -l | tail -20`, true);
      await runCmd(conn, `journalctl -u caddy --no-pager -n 20 2>&1`, true);
    }
  }

  conn.end();
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
