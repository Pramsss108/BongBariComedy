#!/usr/bin/env node
// Preflight: tells a non-coder if a push will deploy cleanly.
// Steps: clean -> type check -> build client -> verify outputs.
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function run(cmd, label){
  process.stdout.write(`\n▶ ${label}\n$ ${cmd}\n`);
  try { execSync(cmd, { stdio: 'inherit' }); } catch (e) { console.error(`✖ Failed: ${label}`); process.exit(1); }
  console.log(`✔ ${label} ok`);
}

console.log('=== BongBari Preflight ===');
console.log('Purpose: Ensure GitHub Pages deploy will succeed before pushing.');

// 1. Type check
run('npm run check', 'TypeScript type check');

// 2. Build client
run('npm run build:client', 'Vite build (client)');

// 3. Verify files
const distDir = path.join(__dirname, '..', 'dist', 'public');
const mustHave = ['index.html','404.html'];
let ok = true;
for(const f of mustHave){
  const p = path.join(distDir, f);
  if(!fs.existsSync(p)){ console.error(`Missing: ${f}`); ok = false; }
}
if(!ok){
  console.error('✖ Required build files missing. Fix before pushing.');
  process.exit(1);
}
console.log('✔ Required build files present.');

console.log('\nSUCCESS: Safe to push.');
