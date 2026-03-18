const fs = require('fs');
const file = 'client/src/pages/SocialDownloaderPage.tsx';
let content = fs.readFileSync(file, 'utf8');

const regex = /\/\/ ENTERING TRIMMER: We need Blob for instant 0ms latency scrubbing[\s\S]+?setCacheProgress\(100\);[\s\r\n]+\}/;

let newContent = content.replace(regex, 
\// Phase 4 Ultra-Light plan -> Direct src without blob buffer for 0ms startup
      setPreviewUrl(streamUrl);
      setShowPreview(true);
      if (enterTrimMode && !trimMode) setTrimMode(true);
      setIsCaching(false);
      setCacheProgress(100);
    }\);

if (newContent !== content) {
    fs.writeFileSync(file, newContent);
    console.log("Success!");
} else {
    console.log("Failed to match regex");
}
