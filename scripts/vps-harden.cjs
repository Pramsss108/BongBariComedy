/**
 * VPS Hardening Script — One-shot SSH push
 * Runs from local machine, connects to Hetzner VPS and applies:
 *   1. Hardened Caddyfile with proper upload timeouts
 *   2. PM2 max-memory-restart 800M
 *   3. /tmp/bongshare orphan cleanup
 */
const { Client } = require('ssh2');

const CADDYFILE = `
{
    servers {
        timeouts {
            read_body 30m
            write 30m
        }
    }
}

api.bongbari.com {
    handle /api/share/upload {
        request_body {
            max_size 10GB
        }
        reverse_proxy localhost:5000 {
            transport http {
                read_timeout 30m
                write_timeout 30m
                response_header_timeout 30m
            }
            header_up X-Real-IP {remote_host}
            header_up X-Forwarded-For {remote_host}
            flush_interval -1
        }
    }
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
    handle /api/share/upload {
        request_body {
            max_size 10GB
        }
        reverse_proxy localhost:5000 {
            transport http {
                read_timeout 30m
                write_timeout 30m
                response_header_timeout 30m
            }
            header_up X-Real-IP {remote_host}
            header_up X-Forwarded-For {remote_host}
            flush_interval -1
        }
    }
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
`.trim();

// Write Caddyfile using base64 to avoid heredoc escaping issues
const caddyB64 = Buffer.from(CADDYFILE).toString('base64');

const CMDS = [
  // 1. Write Caddyfile via base64 decode (avoids shell escaping issues)
  `echo '${caddyB64}' | base64 -d > /etc/caddy/Caddyfile`,
  // 2. Validate
  'caddy validate --config /etc/caddy/Caddyfile 2>&1',
  // 3. Reload Caddy
  'caddy reload --config /etc/caddy/Caddyfile --force 2>&1',
  // 4. PM2 memory limit + restart
  'pm2 restart bongbari --max-memory-restart 800M 2>&1 | tail -6',
  // 5. Save PM2 config
  'pm2 save 2>&1 | tail -2',
  // 6. Cleanup orphaned tmp files older than 30 min
  'mkdir -p /tmp/bongshare && find /tmp/bongshare -type f -mmin +30 -delete 2>/dev/null ; echo "tmp-cleaned"',
  // 7. Wait then verify API
  'sleep 4 && curl -s --max-time 5 http://localhost:5000/api/version',
  // 8. Verify GoFile health
  'curl -s --max-time 10 http://localhost:5000/api/share/gofile-health',
  // 9. PM2 status
  'pm2 list 2>&1 | grep -E "bongbari|online"',
];

const c = new Client();
c.on('ready', () => {
  console.log('✅ SSH Connected to Hetzner VPS');
  let i = 0;
  function next() {
    if (i >= CMDS.length) {
      console.log('\n🎉 VPS hardening complete!');
      c.end();
      return;
    }
    const cmd = CMDS[i];
    const label = `[${i + 1}/${CMDS.length}]`;
    i++;
    c.exec(cmd, (e, s) => {
      if (e) { console.log(label, '❌ EXEC ERR:', e.message); next(); return; }
      let o = '';
      s.on('data', d => { o += d; });
      s.stderr.on('data', d => { o += d; });
      s.on('close', () => {
        const out = o.trim();
        if (out) console.log(label, out);
        else console.log(label, '(ok, no output)');
        next();
      });
    });
  }
  next();
}).on('error', e => {
  console.error('SSH error:', e.message);
}).connect({
  host: '78.47.104.43',
  port: 22,
  username: 'root',
  password: '4rrcFpxhEXAj',
});
