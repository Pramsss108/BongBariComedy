const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  const cmds = `
TEST_IP="2a01:4f8:c0c:185b:1111:2222:3333:cccc"
ip -6 addr add $TEST_IP/128 dev eth0
sleep 3

echo "--- Testing YouTube with yt-dlp through proxy ---"
/usr/local/bin/yt-dlp --source-address $TEST_IP --print "Title: %(title)s" --print "Format: %(format)s" "https://www.youtube.com/watch?v=jNQXAC9IVRw"

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