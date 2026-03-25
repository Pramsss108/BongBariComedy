const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  const cmds = `
TEST_IP="2a01:4f8:c0c:185b:5555:4444:3333:bbbb"
ip -6 addr add $TEST_IP/128 dev eth0

# Wait for Duplicate Address Detection to complete
sleep 3
ip -6 addr show dev eth0 | grep bbbb

OUT_IP=$(curl -s -m 10 --interface $TEST_IP -6 https://api64.ipify.org)
echo "Output IP visible to the world: $OUT_IP"

echo "--- Testing Instagram with yt-dlp ---"
/usr/local/bin/yt-dlp --source-address $TEST_IP -f b --print "Title: %(title)s" --print "Format: %(format)s" "https://www.instagram.com/p/DE-sN2QyfN6/"

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