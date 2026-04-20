const fs = require('fs');
const path = require('path');
const os = require('os');
const puppeteer = require('puppeteer');

const rootDir = path.resolve(__dirname, '..');
const inputDir = path.join(rootDir, 'attached_assets', 'wavex_registration');
const outputPath = path.join(os.homedir(), 'Desktop', 'WAVEX_Registration_Screenshots.pdf');

const SUPPORTED = new Set(['.png', '.jpg', '.jpeg', '.webp']);

function getImages(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((name) => SUPPORTED.has(path.extname(name).toLowerCase()))
    .sort()
    .map((name) => path.join(dir, name));
}

function toFileUrl(p) {
  return 'file:///' + p.replace(/\\/g, '/');
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildHtml(imagePaths) {
  const cards = imagePaths
    .map((img, idx) => {
      const base = path.basename(img);
      return `
        <section class="page">
          <header>
            <h2>WAVEX Registration Screenshot ${idx + 1}</h2>
            <p>${escapeHtml(base)}</p>
          </header>
          <img src="${toFileUrl(img)}" alt="${escapeHtml(base)}" />
        </section>
      `;
    })
    .join('\n');

  return `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>WAVEX Registration Pack</title>
  <style>
    @page { size: A4; margin: 12mm; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Arial, sans-serif; color: #111; }
    .page { page-break-after: always; }
    .page:last-child { page-break-after: auto; }
    header { margin: 0 0 8mm; }
    h2 { margin: 0 0 4px; font-size: 18px; }
    p { margin: 0; color: #555; font-size: 12px; }
    img {
      display: block;
      width: 100%;
      max-height: 250mm;
      object-fit: contain;
      border: 1px solid #ddd;
      border-radius: 8px;
      background: #fff;
    }
  </style>
</head>
<body>
${cards}
</body>
</html>`;
}

(async () => {
  const images = getImages(inputDir);

  if (images.length === 0) {
    console.error('No images found.');
    console.error('Put screenshots in: attached_assets/wavex_registration');
    process.exit(1);
  }

  const html = buildHtml(images);
  const tempHtmlPath = path.join(rootDir, 'attached_assets', 'wavex_registration_preview.html');
  fs.writeFileSync(tempHtmlPath, html, 'utf8');

  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.goto(toFileUrl(tempHtmlPath), { waitUntil: 'networkidle0' });

  await page.pdf({
    path: outputPath,
    format: 'A4',
    printBackground: true,
    margin: { top: '0', right: '0', bottom: '0', left: '0' },
  });

  await browser.close();

  console.log('PDF created successfully.');
  console.log(outputPath);
})();
