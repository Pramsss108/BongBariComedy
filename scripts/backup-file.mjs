#!/usr/bin/env node
/**
 * Usage (PowerShell):
 *   npm run backup:file -- client/src/index.css
 * Saves a timestamped backup under .backups/<path>.<timestamp>.bak
 */

import { argv, exit } from 'node:process';
import { mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

const rel = argv[2];
if (!rel) {
  console.error('Usage: npm run backup:file -- <relative-path>');
  exit(1);
}

const ts = new Date().toISOString().replace(/[:.]/g, '-');
const backupRoot = '.backups';
const destDir = join(backupRoot, dirname(rel));
const dest = join(destDir, `${rel.split('/').pop()}.${ts}.bak`);

try {
  mkdirSync(destDir, { recursive: true });
  copyFileSync(rel, dest);
  console.log(`Backup saved: ${dest}`);
} catch (err) {
  console.error('Backup failed:', err.message || err);
  exit(2);
}
