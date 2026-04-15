const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

(async () => {
  const htmlPath = path.join(__dirname, 'undertaking_letter.html');
  const desktopPath = path.join(require('os').homedir(), 'Desktop');
  const outputPath = path.join(desktopPath, 'Bong_Bari_Undertaking_Letter_Razorpay.pdf');

  console.log('🚀 Launching browser...');
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  console.log('📄 Loading letter...');
  await page.goto('file:///' + htmlPath.replace(/\\/g, '/'), { waitUntil: 'networkidle0' });

  // Hide the download button in PDF
  await page.evaluate(() => {
    document.querySelectorAll('.no-print').forEach(el => el.style.display = 'none');
  });

  console.log('📝 Generating PDF...');
  await page.pdf({
    path: outputPath,
    format: 'A4',
    printBackground: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
  });

  await browser.close();

  console.log('');
  console.log('✅ PDF DOWNLOADED SUCCESSFULLY!');
  console.log('');
  console.log(`📂 Location: ${outputPath}`);
  console.log('');
  console.log('👉 Check your DESKTOP — the file is there!');
})();
