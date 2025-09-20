#!/usr/bin/env node
const vars = process.argv.slice(2);
if (vars.length === 0) {
  console.error('Usage: node scripts/verify-env.mjs VAR1 VAR2 ...');
  process.exit(1);
}
let missing = [];
for (const v of vars) {
  if (!process.env[v] || process.env[v].trim() === '') {
    missing.push(v);
  }
}
if (missing.length) {
  console.error('Missing required env vars:', missing.join(', '));
  process.exit(2);
} else {
  console.log('All required env vars present:', vars.join(', '));
}
