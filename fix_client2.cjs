const fs = require('fs');
const file = 'client/src/pages/SocialDownloaderPage.tsx';
let content = fs.readFileSync(file, 'utf8');

const startStr = "// ENTERING TRIMMER: We need Blob for instant 0ms latency scrubbing";
const endStr = "setCacheProgress(100);\n    }, [";
if (content.includes(startStr) && content.includes(endStr)) {
    const startIndex = content.indexOf(startStr);
    const endIndex = content.indexOf(endStr, startIndex) + "setCacheProgress(100);\n".length;
    
    const newBlock = `// Phase 4 Ultra-Light plan -> Direct src without blob buffer for 0ms startup
      setPreviewUrl(streamUrl);
      setShowPreview(true);
      if (enterTrimMode && !trimMode) setTrimMode(true);
      setIsCaching(false);
      setCacheProgress(100);
`;
    
    content = content.substring(0, startIndex) + newBlock + content.substring(endIndex);
    fs.writeFileSync(file, content);
    console.log("Replaced successfully via index");
} else {
    console.log("Could not find start or end string.");
}
