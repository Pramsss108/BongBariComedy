const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  console.log('Client :: ready');
  
  const cmds = `
cat << 'EOF' > /etc/ndppd.conf
route-ttl 30000
proxy eth0 {
   router yes
   timeout 500
   ttl 30000
   rule 2a01:4f8:c0c:185b::/64 {
      static
   }
}
EOF
sysctl -w net.ipv6.conf.all.forwarding=1
grep -qxF "net.ipv6.conf.all.forwarding=1" /etc/sysctl.conf || echo "net.ipv6.conf.all.forwarding=1" >> /etc/sysctl.conf
sysctl -p
systemctl restart ndppd
systemctl enable ndppd
echo "✅ NUCLEAR IPv6 SWARM IS CONFIGURED AND RUNNING!"
`;

  console.log("Executing Remote Setup commands...");
  conn.exec(cmds, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
      console.log('Stream :: close :: code: ' + code + ', signal: ' + signal);
      conn.end();
    }).on('data', (data) => {
      console.log('STDOUT:\n' + data);
    }).stderr.on('data', (data) => {
      console.log('STDERR:\n' + data);
    });
  });
}).connect({
  host: '78.47.104.43',
  port: 22,
  username: 'root',
  password: 'mXeVuj3cMuMF'
});
