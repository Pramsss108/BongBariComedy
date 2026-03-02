// scripts/generate-tools-favicon.cjs
// Generates a purple/violet ⚙ gear favicon for the /tools page
// Run: node scripts/generate-tools-favicon.cjs

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const OUT_DIR = path.join(__dirname, '..', 'client', 'public');

// Purple ⚙ gear icon on violet rounded-rect background
// We encode a minimal SVG with a gear path
function makeSVG(size) {
  const r = Math.round(size * 0.22); // corner radius
  const cx = size / 2;
  const cy = size / 2;
  // Gear as SVG path scaled to 'size'
  // We'll use a simpler approach: text emoji or inline gear path
  const scale = size / 64;
  const gear = `
    <g transform="translate(${cx},${cy}) scale(${scale})">
      <!-- outer gear ring -->
      <circle cx="0" cy="0" r="14" fill="none" stroke="#fff" stroke-width="4"/>
      <!-- teeth -->
      <rect x="-3" y="-21" width="6" height="9" rx="2" fill="#fff"/>
      <rect x="-3" y="12" width="6" height="9" rx="2" fill="#fff"/>
      <rect x="12" y="-3" width="9" height="6" rx="2" fill="#fff"/>
      <rect x="-21" y="-3" width="9" height="6" rx="2" fill="#fff"/>
      <rect x="8.6" y="-16.5" width="6" height="9" rx="2" fill="#fff" transform="rotate(45)"/>
      <rect x="-14.6" y="-16.5" width="6" height="9" rx="2" fill="#fff" transform="rotate(-45)"/>
      <rect x="8.6" y="7.5" width="6" height="9" rx="2" fill="#fff" transform="rotate(-45)"/>
      <rect x="-14.6" y="7.5" width="6" height="9" rx="2" fill="#fff" transform="rotate(45)"/>
      <!-- center hole -->
      <circle cx="0" cy="0" r="6" fill="#7C3AED"/>
      <circle cx="0" cy="0" r="3.5" fill="#fff"/>
    </g>
  `;

  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#7C3AED"/>
        <stop offset="100%" stop-color="#5B21B6"/>
      </linearGradient>
    </defs>
    <rect width="${size}" height="${size}" rx="${r}" ry="${r}" fill="url(#bg)"/>
    ${gear}
  </svg>`);
}

const SIZES = [16, 32, 48, 180, 192];

(async () => {
  console.log('🔧 Generating tools page favicon...');
  for (const sz of SIZES) {
    const svg = makeSVG(sz);
    const outPath = path.join(OUT_DIR, `tools-favicon-${sz}.png`);
    await sharp(svg, { density: 300 })
      .resize(sz, sz)
      .png({ compressionLevel: 9 })
      .toFile(outPath);
    console.log(`  ✅ tools-favicon-${sz}.png`);
  }

  // Create .ico (16+32 combined — just use 32px as single-size .ico via PNG)
  const ico32 = await sharp(makeSVG(32), { density: 300 })
    .resize(32, 32)
    .png()
    .toBuffer();
  fs.writeFileSync(path.join(OUT_DIR, 'tools-favicon.ico'), ico32);
  console.log('  ✅ tools-favicon.ico');
  console.log('\n🎉 All /tools favicons generated!');
})();
