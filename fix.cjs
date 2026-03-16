const fs = require('fs');
const txt = fs.readFileSync('client/src/components/TrimSlider.tsx', 'utf8');

const idx = txt.indexOf('{/* Playhead */}');
const endIdx = txt.indexOf('{/* YouTube Style Hover', idx);

if (idx !== -1 && endIdx !== -1) {
  const newBlock = `{/* Playhead */}
        <div
           ref={playheadRef}
           className="absolute top-0 bottom-0 w-[2px] bg-white z-30 pointer-events-none drop-shadow-md rounded-full shadow-[0_0_8px_rgba(255,255,255,0.8)]"
           style={{ left: \`\${currentPercent}%\`, marginLeft: '-1px' }}
        />

        `;
  const newTxt = txt.substring(0, idx) + newBlock + txt.substring(endIdx);
  fs.writeFileSync('client/src/components/TrimSlider.tsx', newTxt);
  console.log('Fixed');
} else {
  console.log('Not found');
}
