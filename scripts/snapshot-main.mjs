#!/usr/bin/env node
/**
 * Creates a fresh snapshot of origin/main (tracked files) under .snapshot-main/
 * Usage:
 *   npm run git:fetch ; npm run snapshot:main
 */
import { execSync } from 'node:child_process';
import { rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

try {
  execSync('git fetch origin --quiet', { stdio: 'inherit' });
  const dir = '.snapshot-main';
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  // list tracked files on main
  const files = execSync('git ls-tree -r --name-only origin/main', { encoding: 'utf8' })
    .split(/\r?\n/)
    .filter(Boolean);
  for (const f of files) {
    const content = execSync(`git show origin/main:${f}`, { encoding: 'utf8' });
    const target = join(dir, f);
    mkdirSync(join(target, '..'), { recursive: true });
    writeFileSync(target, content, 'utf8');
  }
  writeFileSync(join(dir, '_INFO.txt'), 'Snapshot of origin/main created at ' + new Date().toISOString(), 'utf8');
  console.log(`Snapshot created: ${dir} (files: ${files.length})`);
} catch (e) {
  console.error('Snapshot failed:', e.message || e);
  process.exit(1);
}
