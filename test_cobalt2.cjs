const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  const cmds = `
echo "=== Checking Cobalt Container Status ==="
docker ps -a | grep cobalt

echo "=== Testing Local Cobalt API ==="
curl -m 10 -X POST -H "Accept: application/json" -H "Content-Type: application/json" -d '{"url":"https://www.youtube.com/watch?v=jNQXAC9IVRw"}' http://127.0.0.1:9000/
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