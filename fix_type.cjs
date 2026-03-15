const fs = require('fs');

let uiCode = fs.readFileSync('client/src/pages/VoiceHub.tsx', 'utf8');

uiCode = uiCode.replace(
    /"url = await generateEnglishSpeech\(text, englishVoice, \(msg, pct\) => \{ setProgressMsg\(msg\); if \(pct\) setLoadProgress\(pct\); \}\);"/g,
    "url = await generateEnglishSpeech(text, englishVoice, (msg) => { setProgressMsg(msg); });"
);

uiCode = uiCode.replace(
    /url = await generateEnglishSpeech\(text, englishVoice, \(msg, pct\) => \{ setProgressMsg\(msg\); if \(pct\) setLoadProgress\(pct\); \}\);/,
    "url = await generateEnglishSpeech(text, englishVoice, (msg: string) => { setProgressMsg(msg); });"
);

uiCode = uiCode.replace(
    /\(msg, pct\) => \{ setProgressMsg\(msg\); if\(pct !== undefined\) setLoadProgress\(pct\); \},/g,
    "(msg: string, pct?: number) => { setProgressMsg(msg); if(pct !== undefined) setLoadProgress(pct); },"
);


fs.writeFileSync('client/src/pages/VoiceHub.tsx', uiCode);
