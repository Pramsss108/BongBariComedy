/**
 * Process raw signature photo → clean transparent e-signature PNG
 * Uses Puppeteer (already installed) to process the image via browser canvas API
 * Removes background, crops to ink, outputs clean transparent PNG
 */
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const inputPath = process.argv[2] || path.join(__dirname, 'signature_raw.png');
const outputPath = process.argv[3] || path.join(__dirname, 'signature.png');

(async () => {
  if (!fs.existsSync(inputPath)) {
    console.error(`❌ Input file not found: ${inputPath}`);
    process.exit(1);
  }

  // Convert input image to base64 data URI
  const imgBuf = fs.readFileSync(inputPath);
  const b64 = imgBuf.toString('base64');
  const dataUri = `data:image/png;base64,${b64}`;

  console.log('🚀 Launching browser...');
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  console.log('📷 Processing signature...');

  // Process the image in browser context using Canvas API
  const resultB64 = await page.evaluate(async (dataUri) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const w = img.width, h = img.height;

        // First pass: draw image, find ink bounding box
        const tmpCanvas = document.createElement('canvas');
        tmpCanvas.width = w;
        tmpCanvas.height = h;
        const tmpCtx = tmpCanvas.getContext('2d');
        tmpCtx.drawImage(img, 0, 0);
        const imgData = tmpCtx.getImageData(0, 0, w, h);
        const data = imgData.data;

        let minX = w, minY = h, maxX = 0, maxY = 0;
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const i = (y * w + x) * 4;
            const brightness = (data[i] + data[i+1] + data[i+2]) / 3;
            if (brightness < 160) {
              if (x < minX) minX = x;
              if (y < minY) minY = y;
              if (x > maxX) maxX = x;
              if (y > maxY) maxY = y;
            }
          }
        }

        // Padding
        const pad = 15;
        minX = Math.max(0, minX - pad);
        minY = Math.max(0, minY - pad);
        maxX = Math.min(w - 1, maxX + pad);
        maxY = Math.min(h - 1, maxY + pad);

        const cropW = maxX - minX + 1;
        const cropH = maxY - minY + 1;

        // Create output canvas
        const outCanvas = document.createElement('canvas');
        outCanvas.width = cropW;
        outCanvas.height = cropH;
        const outCtx = outCanvas.getContext('2d');

        // Draw cropped region
        outCtx.drawImage(tmpCanvas, minX, minY, cropW, cropH, 0, 0, cropW, cropH);

        // Process pixels: remove background, enhance ink
        const outData = outCtx.getImageData(0, 0, cropW, cropH);
        const pixels = outData.data;

        for (let i = 0; i < pixels.length; i += 4) {
          const r = pixels[i], g = pixels[i+1], b = pixels[i+2];
          const brightness = (r + g + b) / 3;

          if (brightness > 185) {
            // Light background → transparent
            pixels[i+3] = 0;
          } else if (brightness > 145) {
            // Edge transition → partial transparency
            const alpha = Math.round(255 * (1 - (brightness - 145) / 40));
            pixels[i+3] = alpha;
            // Tint toward blue ink
            pixels[i] = Math.round(r * 0.4);
            pixels[i+1] = Math.round(g * 0.3);
            pixels[i+2] = Math.min(255, Math.round(b * 1.1 + 40));
          } else {
            // Dark ink → keep, enhance blue
            pixels[i] = Math.max(0, Math.round(r * 0.35));
            pixels[i+1] = Math.max(0, Math.round(g * 0.25));
            pixels[i+2] = Math.min(255, Math.round(b * 1.15 + 35));
            pixels[i+3] = 255;
          }
        }

        outCtx.putImageData(outData, 0, 0);

        // Return as base64 PNG
        const pngDataUrl = outCanvas.toDataURL('image/png');
        resolve(pngDataUrl.replace('data:image/png;base64,', ''));
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = dataUri;
    });
  }, dataUri);

  await browser.close();

  // Save the processed PNG
  const outBuf = Buffer.from(resultB64, 'base64');
  fs.writeFileSync(outputPath, outBuf);

  console.log(`✅ Clean e-signature saved!`);
  console.log(`   📂 ${outputPath}`);
  console.log(`   📐 Size: ${(outBuf.length / 1024).toFixed(1)} KB`);
})();
