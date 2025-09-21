// Copies dist/public/index.html to dist/public/404.html for GitHub Pages SPA routing
// Ensures runtime API base fallback script is present on deep links.
const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', 'dist', 'public');
const indexPath = path.join(distDir, 'index.html');
const notFoundPath = path.join(distDir, '404.html');

if (fs.existsSync(indexPath)) {
  try {
    fs.copyFileSync(indexPath, notFoundPath);
    console.log('[postbuild-spa-404] 404.html created from index.html');
  } catch (err) {
    console.error('[postbuild-spa-404] Failed to create 404.html:', err);
    process.exitCode = 1;
  }
} else {
  console.warn('[postbuild-spa-404] index.html not found; skipping 404.html generation');
}
