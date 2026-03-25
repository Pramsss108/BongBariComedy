const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  console.log('Client :: ready :: Connecting to Hetzner to test proxy...');
  
  const cmds = `
# 1. Update/Install latest yt-dlp to be sure
wget -qO /usr/local/bin/yt-dlp https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp
chmod a+rx /usr/local/bin/yt-dlp
apt-get install -y jq curl > /dev/null 2>&1

# 2. Pick a random test IP from your pool
TEST_IP="2a01:4f8:c0c:185b:7777:8888:9999:aaaa"

echo "Adding test IP ($TEST_IP) proxy binding temporarily..."
ip -6 addr add $TEST_IP/64 dev eth0

echo -e "\n=== 1. VERIFYING IP SPOOFING ==="
TESTED_IP=$(curl -s -m 10 --interface $TEST_IP -6 https://api64.ipify.org || echo "FAILED")
echo "Output IP visible to the world: $TESTED_IP"

echo -e "\n=== 2. TESTING INSTAGRAM FETCH VIA SPOOFED IP ==="
/usr/local/bin/yt-dlp --source-address $TEST_IP -f b --print "Title: %(title)s" --print "Resolution: %(resolution)s" --print "Format: %(format)s" --print "Audio: %(acodec)s" "https://www.instagram.com/p/DE-sN2QyfN6/" || echo "Instagram failed context."

echo -e "\n=== 3. TESTING YOUTUBE FETCH VIA SPOOFED IP ==="
/usr/local/bin/yt-dlp --source-address $TEST_IP --print "Title: %(title)s" "https://www.youtube.com/watch?v=jNQXAC9IVRw" || echo "YouTube failed context."

echo -e "\nCleaning up..."
ip -6 addr del $TEST_IP/64 dev eth0
echo "Done."
`;

  conn.exec(cmds, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
      console.log('\n--- Test Complete ---');
      conn.end();
    }).on('data', (data) => {
      process.stdout.write(data.toString());
    }).stderr.on('data', (data) => {
      process.stdout.write("WARN/ERR: " + data.toString());
    });
  });
}).connect({
  host: '78.47.104.43',
  port: 22,
  username: 'root',
  password: 'mXeVuj3cMuMF'
});
