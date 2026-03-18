const fs = require('fs');
const file = 'client/src/pages/SocialDownloaderPage.tsx';
let content = fs.readFileSync(file, 'utf8');

const regex = /\/\/ ENTERING TRIMMER: We need Blob for instant 0ms latency scrubbing[\s\S]+?setIsCaching\(false\);\n\s*setCacheProgress\(100\);\n\s*\},/;

let newContent = content.replace(regex, 
`// Phase 4 Ultra-Light plan -> Direct src without blob buffer for 0ms startup
      setPreviewUrl(streamUrl);
      setShowPreview(true);
      if (enterTrimMode && !trimMode) setTrimMode(true);
      setIsCaching(false);
      setCacheProgress(100);
    },`);

if (newContent !== content) {
    fs.writeFileSync(file, newContent);
    console.log("Fixed client blob fetch via regex");
} else {
    console.log("No change!");
}
