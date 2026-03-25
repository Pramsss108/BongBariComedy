const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  const cmds = `
TEST_IP="2a01:4f8:c0c:185b:7777:8888:9999:aaaa"
sysctl -w net.ipv6.ip_nonlocal_bind=1
ip -6 addr add $TEST_IP/128 dev eth0
ip -6 addr show dev eth0
curl -m 10 --interface $TEST_IP -6 https://api64.ipify.org
ip -6 addr del $TEST_IP/128 dev eth0
`;

  conn.exec(cmds, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
      conn.end();
    }).on('data', (data) => {
      process.stdout.write(data.toString());
    }).stderr.on('data', (data) => {
      process.stdout.write("ERR: " + data.toString());
    });
  });
}).connect({
  host: '78.47.104.43',
  port: 22,
  username: 'root',
  password: 'mXeVuj3cMuMF'
});