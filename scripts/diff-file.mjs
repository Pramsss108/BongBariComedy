#!/usr/bin/env node
/**
 * Usage (PowerShell):
 *   npm run git:fetch ; npm run diff:file -- client/src/index.css
 * Shows a diff between local file and origin/main version.
 */

import { execSync } from 'node:child_process';
import { argv, exit } from 'node:process';

const rel = argv[2];
if (!rel) {
  console.error('Usage: npm run diff:file -- <relative-path>');
  exit(1);
}

try {
  execSync('git fetch origin --quiet', { stdio: 'inherit' });
  // Use -- to handle filenames that look like options
  const cmd = `git diff --no-index -- ${rel} <(git show origin/main:${rel})`;
  // On Windows PowerShell, process substitution is not available.
  // Fallback: write remote content to a temp file.
  const remote = execSync(`git show origin/main:${rel}`, { encoding: 'utf8' });
  const { mkdtempSync, writeFileSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const dir = mkdtempSync(join(tmpdir(), 'bbc-'));
  const tmp = join(dir, 'remote.tmp');
  writeFileSync(tmp, remote, 'utf8');
  const diff = execSync(`git --no-pager diff --no-index -- ${tmp} ${rel}`, { encoding: 'utf8' });
  console.log(diff || 'No differences.');
} catch (err) {
  if (err.stdout) console.log(err.stdout.toString());
  if (err.stderr) console.error(err.stderr.toString());
  else console.error(err.message || err);
  // git diff returns 1 when there are differences; don't treat that as fatal
  exit(0);
}
