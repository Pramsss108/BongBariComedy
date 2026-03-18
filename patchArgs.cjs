const fs = require('fs');
let code = fs.readFileSync('server/routes/downloader.ts', 'utf8');

const regexArgs = /const ffmpegArgs = \[\s*'-user_agent'[^\]]*'pipe:1'\s*\];/m;

const newArgs = `const ffmpegArgs = [
                            '-user_agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                            '-headers', 'Accept: */*\\r\\nReferer: https://www.youtube.com/\\r\\n',
                            '-ss', start.toString(),
                            '-i', data.url,
                            '-t', duration.toString(),
                            '-c:v', 'libx264',
                            '-preset', 'ultrafast',
                            '-crf', '28',
                            '-c:a', 'aac',
                            '-movflags', 'frag_keyframe+empty_moov',
                            '-f', 'mp4',
                            'pipe:1'
                        ];`;

console.log("Regex matched?", regexArgs.test(code));
code = code.replace(regexArgs, newArgs);
fs.writeFileSync('server/routes/downloader.ts', code);
