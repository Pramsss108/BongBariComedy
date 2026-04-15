/**
 * Process raw signature photo → clean transparent e-signature PNG
 * Removes background, keeps only the blue ink, outputs clean PNG
 * 
 * Usage: node process_signature.cjs [input.png] [output.png]
 */
const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

const inputPath = process.argv[2] || path.join(__dirname, 'signature_raw.png');
const outputPath = process.argv[3] || path.join(__dirname, 'signature.png');

(async () => {
  try {
    // Check if canvas module exists
    require.resolve('canvas');
  } catch {
    console.log('Installing canvas module...');
    require('child_process').execSync('npm install canvas --no-save', { stdio: 'inherit' });
  }

  const { createCanvas, loadImage } = require('canvas');
  
  console.log('📷 Loading raw signature...');
  const img = await loadImage(inputPath);
  
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  
  // Find bounding box of the ink (non-white/non-light pixels)
  let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;
  
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const i = (y * canvas.width + x) * 4;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      
      // Detect dark/blue ink pixels (not white/light gray background)
      const brightness = (r + g + b) / 3;
      if (brightness < 160) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  
  // Add padding
  const pad = 10;
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(canvas.width - 1, maxX + pad);
  maxY = Math.min(canvas.height - 1, maxY + pad);
  
  const cropW = maxX - minX + 1;
  const cropH = maxY - minY + 1;
  
  console.log(`✂️  Cropping to ink area: ${cropW}x${cropH} (from ${canvas.width}x${canvas.height})`);
  
  // Create cropped canvas with transparency
  const outCanvas = createCanvas(cropW, cropH);
  const outCtx = outCanvas.getContext('2d');
  
  // Draw cropped region
  outCtx.drawImage(canvas, minX, minY, cropW, cropH, 0, 0, cropW, cropH);
  
  // Make background transparent, keep ink
  const outData = outCtx.getImageData(0, 0, cropW, cropH);
  const pixels = outData.data;
  
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
    const brightness = (r + g + b) / 3;
    
    if (brightness > 180) {
      // Light pixel → fully transparent
      pixels[i + 3] = 0;
    } else if (brightness > 140) {
      // Semi-light → partial transparency (anti-alias edge)
      pixels[i + 3] = Math.round(255 * (1 - (brightness - 140) / 40));
    } else {
      // Dark ink → keep opaque, enhance blue tint
      // Shift color towards deep blue ink
      const inkR = Math.max(0, Math.min(255, Math.round(r * 0.3)));
      const inkG = Math.max(0, Math.min(255, Math.round(g * 0.3)));
      const inkB = Math.max(0, Math.min(255, Math.round(b * 1.2 + 30)));
      pixels[i] = inkR;
      pixels[i + 1] = inkG;
      pixels[i + 2] = Math.min(255, inkB);
      pixels[i + 3] = 255;
    }
  }
  
  outCtx.putImageData(outData, 0, 0);
  
  // Save
  const buf = outCanvas.toBuffer('image/png');
  fs.writeFileSync(outputPath, buf);
  
  console.log(`✅ Clean e-signature saved: ${outputPath}`);
  console.log(`   Size: ${(buf.length / 1024).toFixed(1)} KB, Dimensions: ${cropW}x${cropH}`);
})();
