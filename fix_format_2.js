const fs=require('fs'); 
let c=fs.readFileSync('server/routes/downloader.ts','utf8'); 
c = c.replace(/const data = await executeYtDlpExtract\(url, \["--format", \est\[height.+best\\]\);/, 'const data = await executeYtDlpExtract(url, ["--format", "b"]);'); 

c = c.replace(/const ytdlArgs = \["-f", \est\[height<=\\\$\\{qStr\\}\]\[ext=mp4\]\/best\.+\];/, 'const ytdlArgs = ["-f", "b", "-o", "-", "--no-warnings", "--force-ipv4"];');
fs.writeFileSync('server/routes/downloader.ts',c); 
console.log('done!');
