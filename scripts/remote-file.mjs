#!/usr/bin/env node
/**
 * Usage (PowerShell):
 *   npm run git:fetch ; npm run remote:file -- client/src/index.css
 * Shows the file from origin/main to compare before restoring.
 */

import { execSync } from 'node:child_process';
import { argv, exit } from 'node:process';

const rel = argv[2];
if (!rel) {
  console.error('Usage: npm run remote:file -- <relative-path>');
  exit(1);
}

try {
  // Ensure we have the latest refs from origin
  execSync('git fetch origin --quiet', { stdio: 'inherit' });
  const content = execSync(`git show origin/main:${rel}`, { encoding: 'utf8' });
  console.log(content);
} catch (err) {
  console.error('Failed to read remote file from origin/main:', err.message || err);
  exit(2);
}
