#!/usr/bin/env node
/**
 * Usage (PowerShell):
 *   npm run restore:file -- client/src/index.css
 * Restores the local file from origin/main after creating a backup.
 */

import { execSync } from 'node:child_process';
import { argv, exit } from 'node:process';
import { writeFileSync } from 'node:fs';

const rel = argv[2];
if (!rel) {
  console.error('Usage: npm run restore:file -- <relative-path>');
  exit(1);
}

try {
  execSync('git fetch origin --quiet', { stdio: 'inherit' });
  // backup first
  execSync(`npm run -s backup:file -- ${rel}`, { stdio: 'inherit' });
  const content = execSync(`git show origin/main:${rel}`, { encoding: 'utf8' });
  writeFileSync(rel, content, 'utf8');
  console.log(`Restored ${rel} from origin/main (backup saved).`);
  console.log('Tip: review changes with:');
  console.log(`  git --no-pager diff -- ${rel}`);
} catch (err) {
  console.error('Restore failed:', err.message || err);
  exit(2);
}
