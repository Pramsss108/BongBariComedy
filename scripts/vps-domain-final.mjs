/**
 * vps-domain-final.mjs — Configure api.bongbari.com HTTPS + verify
 * After running: user just needs to add A record api.bongbari.com → 78.47.104.43 in Hostinger
 */
import { Client } from 'ssh2';

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

// Caddyfile: serves api.bongbari.com on HTTPS (auto Let's Encrypt)
// Also serves plain IP on port 80 for diagnostics
const CADDYFILE = `# BongBari API — Caddy
# api.bongbari.com → HTTPS (auto Let's Encrypt once DNS A record points here)
# :80 → plain HTTP fallback for diagnostics / Let's Encrypt challenges

api.bongbari.com {
    handle /api/* {
        request_body {
            max_size 10GB
        }
        reverse_proxy localhost:5000 {
            header_up X-Real-IP {remote_host}
            header_up X-Forwarded-For {remote_host}
        }
    }
    handle {
        reverse_proxy localhost:5000 {
            header_up X-Real-IP {remote_host}
        }
    }
}

:80 {
    handle /api/* {
        request_body {
            max_size 10GB
        }
        reverse_proxy localhost:5000 {
            header_up X-Real-IP {remote_host}
            header_up X-Forwarded-For {remote_host}
        }
    }
    handle {
        reverse_proxy localhost:5000 {
            header_up X-Real-IP {remote_host}
        }
    }
}
`;

async function main() {
  const conn = new Client();
  await new Promise((res, rej) => {
    conn.on('ready', res).on('error', rej).connect(VPS);
  });
  console.log('✅ Connected!\n');

  // Kill old caddy processes
  await runCmd(conn, `pkill -f 'caddy run' 2>/dev/null; sleep 1; echo "old caddy killed"`, true);

  // Write new Caddyfile  
  console.log('📝 Writing new Caddyfile (api.bongbari.com + :80)...');
  // Use printf to avoid heredoc issues
  const lines = CADDYFILE.split('\n');
  const writeCmd = `printf '%s\\n' ${lines.map(l => `'${l.replace(/'/g, "'\\''")}'`).join(' ')} > /etc/caddy/Caddyfile`;
  // Use a simpler approach via base64 
  const b64 = Buffer.from(CADDYFILE).toString('base64');
  await runCmd(conn, `echo '${b64}' | base64 -d > /etc/caddy/Caddyfile`, false);
  console.log('   ✅ Written');

  // Validate
  console.log('\n🔍 Validating...');
  const valid = await runCmd(conn, `caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile 2>&1`, true);
  if (valid.includes('Valid') || valid.includes('valid')) {
    console.log('   ✅ Caddyfile valid');
  } else {
    console.log('   Output:', valid.slice(0, 300));
  }

  // Start Caddy
  console.log('\n🚀 Starting Caddy...');
  await runCmd(conn, `nohup caddy run --config /etc/caddy/Caddyfile --adapter caddyfile > /var/log/caddy.log 2>&1 & sleep 3 && echo "Caddy started"`, true);

  // Check port 443 is listening (for HTTPS)
  const ports = await runCmd(conn, `ss -tlpn | grep -E '80|443|5000' || netstat -tlpn 2>/dev/null | grep -E '80|443|5000'`, true);
  console.log('\n📡 Listening ports:\n' + ports);

  // Verify port 80
  const v80 = await runCmd(conn, `curl -s --max-time 5 http://localhost:80/api/version || echo "NO_RESPONSE"`, true);
  console.log(`\nPort 80:  ${v80.includes('NO_RESPONSE') ? '❌' : '✅'} ${v80.slice(0, 100)}`);

  // External
  const vExt = await runCmd(conn, `curl -s --max-time 8 http://78.47.104.43/api/version || echo "NO_RESPONSE"`, true);
  console.log(`External: ${vExt.includes('NO_RESPONSE') ? '❌' : '✅'} ${vExt.slice(0, 100)}`);

  if (v80.includes('NO_RESPONSE')) {
    console.log('\n⚠️ Port 80 not responding — caddy logs:');
    await runCmd(conn, `tail -30 /var/log/caddy.log 2>&1`, true);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 NEXT STEP (user action):');
  console.log('   In Hostinger DNS → Add A record:');
  console.log('   Name: api    Value: 78.47.104.43    TTL: 3600');
  console.log('   Once DNS propagates (5-15 min), https://api.bongbari.com will be live with auto-SSL');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  conn.end();
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
