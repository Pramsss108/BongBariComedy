/**
 * vps-setup-domain.mjs — Configure api.bongbari.com HTTPS on Caddy
 * Updates Caddyfile to serve HTTP (for now) + HTTPS once DNS A record is set
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

const CADDYFILE = `# BongBari API Server — Caddy config
# Handles api.bongbari.com with auto-HTTPS (Let's Encrypt)
# Also handles plain IP access as fallback

:80 {
    # Proxy all /api/* traffic to Node.js on 5000
    handle /api/* {
        request_body {
            max_size 10GB
        }
        reverse_proxy localhost:5000 {
            header_up X-Real-IP {remote_host}
            header_up X-Forwarded-For {remote_host}
        }
    }

    # Static public files directory
    handle /static/* {
        root * /opt/bongbari/public
        file_server
    }

    # Health check
    handle /health {
        respond "OK" 200
    }

    # Default: proxy to app
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

  // Write Caddyfile
  console.log('📝 Writing Caddyfile for domain + IP access...');
  const escapedCaddyfile = CADDYFILE.replace(/'/g, "'\\''");
  await runCmd(conn, `cat > /etc/caddy/Caddyfile << 'CADDYEOF'\n${CADDYFILE}\nCADDYEOF`, true);

  // Validate Caddyfile
  console.log('\n🔍 Validating Caddyfile...');
  await runCmd(conn, `caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile 2>&1`, true);

  // Kill existing Caddy and restart
  console.log('\n🔄 Restarting Caddy...');
  await runCmd(conn, `pkill -f 'caddy run' 2>/dev/null; sleep 1; nohup caddy run --config /etc/caddy/Caddyfile --adapter caddyfile > /var/log/caddy.log 2>&1 & echo $!`, true);

  // Wait for Caddy
  await new Promise(r => setTimeout(r, 2000));

  // Verify
  console.log('\n🔍 Verifying...');
  const v80 = await runCmd(conn, `curl -s --max-time 5 http://localhost:80/api/version || echo "NO_RESPONSE"`, true);
  const vExt = await runCmd(conn, `curl -s --max-time 8 http://78.47.104.43/api/version || echo "NO_RESPONSE"`, true);

  console.log(`\nPort 80:  ${v80.includes('NO_RESPONSE') ? '❌' : '✅'} ${v80.slice(0, 80)}`);
  console.log(`External: ${vExt.includes('NO_RESPONSE') ? '❌' : '✅'} ${vExt.slice(0, 80)}`);

  if (!vExt.includes('NO_RESPONSE')) {
    console.log('\n✅ VPS accessible at http://78.47.104.43');
    console.log('\n📋 TODO (user action needed):');
    console.log('   1. Log into Hostinger DNS panel');
    console.log('   2. Add A record: api.bongbari.com → 78.47.104.43');
    console.log('   3. Wait 5-15 min for DNS propagation');
    console.log('   4. Caddy will auto-provision SSL certificate for api.bongbari.com');
  } else {
    console.log('\n⚠️ Caddy not responding — checking logs...');
    await runCmd(conn, `tail -20 /var/log/caddy.log 2>&1`, true);
  }

  conn.end();
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
