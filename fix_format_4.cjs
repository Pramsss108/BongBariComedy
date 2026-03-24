const fs=require('fs');
let lines = fs.readFileSync('server/routes/downloader.ts', 'utf8').split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('executeYtDlpExtract(url, ["--format"')) {
      lines[i] = lines[i].replace(/\["--format".+\]/, '["--format", "b"]');
  }
  if (lines[i].includes('const ytdlArgs = ["-f", est')) {
      lines[i] = '            const ytdlArgs = ["-f", "b", "-o", "-", "--no-warnings", "--force-ipv4"];';
  }
}
fs.writeFileSync('server/routes/downloader.ts', lines.join('\n'));
console.log('Line by line replacement done.');
