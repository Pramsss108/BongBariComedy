const sharp = require('sharp');

const makeSvg = (s) => {
  const r = Math.round(s * 0.22);
  const fs = Math.round(s * 0.68);
  return Buffer.from(
    `<svg width="${s}" height="${s}" viewBox="0 0 ${s} ${s}" xmlns="http://www.w3.org/2000/svg">` +
    `<rect width="${s}" height="${s}" rx="${r}" fill="#f59e0b"/>` +
    `<text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" ` +
    `font-family="Arial,sans-serif" font-size="${fs}" font-weight="900" fill="#09090b">&#9889;</text>` +
    `</svg>`
  );
};

const sizes = [16, 32, 48, 180, 192];

Promise.all(
  sizes.map(s =>
    sharp(makeSvg(s))
      .png()
      .toFile(`client/public/humanizer-favicon-${s}.png`)
      .then(() => console.log(`✅ humanizer-favicon-${s}.png`))
  )
)
  .then(() => {
    // also write a 32x32 version as humanizer-favicon.ico (PNG renamed — browsers accept this)
    return sharp(makeSvg(32)).png().toFile('client/public/humanizer-favicon.ico');
  })
  .then(() => console.log('✅ humanizer-favicon.ico'))
  .catch(e => { console.error('❌', e.message); process.exit(1); });
