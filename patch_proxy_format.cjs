const fs = require('fs');
const file = 'server/routes/downloader.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  /const data = await executeYtDlpExtract\(url, \["--format", \est\\[height<=\\\$\\{qStr\\}\\]\\[ext=mp4\\]\\/best\\[height<=\\\$\\{qStr\\}\\]\\/best\\]\);/g,
  'const data = await executeYtDlpExtract(url, ["--format", "b"]);'
);
code = code.replace(
  /const ytdlArgs = \\["-f", \est\\[height<=\\\$\\{qStr\\}\\]\\[ext=mp4\\]\\/best\, "-o", "-", "--no-warnings", "--force-ipv4"\\];/g,
  'const ytdlArgs = ["-f", "b", "-o", "-", "--no-warnings", "--force-ipv4"];'
);

fs.writeFileSync(file, code);
console.log('Patched proxy formats to use \"b\" to guarantee audio!');
