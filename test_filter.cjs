const fs = require('fs');

const d = fs.readFileSync('c:\\Users\\guita\\AppData\\Roaming\\Code\\User\\workspaceStorage\\df8c55284d96f5fd11fb5625cc3aeeb9\\GitHub.copilot-chat\\chat-session-resources\\6349c8ae-6f52-4158-800c-fd82d4f7b151\\call_MHxoTVFBeHFnd1lKZzFpNnBrN08__vscode-1774411830364\\content.txt', 'utf8');
const jsonStr=d.substring(d.indexOf('{"id'));
const data = JSON.parse(jsonStr);
const rawFormats = data.formats;

const premuxed = rawFormats.filter((f) =>
    f.ext === 'mp4' && f.acodec && f.acodec !== 'none' && f.vcodec && f.vcodec !== 'none' && f.url && f.url.startsWith('http') && !f.url.includes('.m3u8')
);

console.log('Premuxed length:', premuxed.length);
if(premuxed.length) console.log(premuxed.map(f=>f.format_id));

const fallback = rawFormats.find((f) =>
    f.vcodec && f.vcodec !== 'none' && f.url && f.url.startsWith('http') && !f.url.includes('manifest') && !f.url.includes('.m3u8')
);

console.log('Fallback:', fallback.format_id);