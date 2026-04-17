#!/usr/bin/env node
/**
 * dev-pro.cjs — Grant or revoke NGL PRO for testing (no real payment).
 *
 * Usage:
 *   node scripts/dev-pro.cjs grant pramsss108          # 30 days PRO
 *   node scripts/dev-pro.cjs grant pramsss108 7         # 7 days PRO
 *   node scripts/dev-pro.cjs revoke pramsss108          # remove PRO
 *   node scripts/dev-pro.cjs status pramsss108          # check if PRO
 *
 * Works against local (localhost:5000) by default.
 * Set DEV_API_BASE=https://api.bongbari.com to target production.
 */
'use strict';

const fs = require('fs');
const path = require('path');

// Load server/.env to get the dev-grant secret
function loadSecret() {
  const envPath = path.join(__dirname, '..', 'server', '.env');
  if (!fs.existsSync(envPath)) {
    console.error('ERROR: server/.env not found. Cannot read NGL_DEV_GRANT_SECRET.');
    process.exit(1);
  }
  const content = fs.readFileSync(envPath, 'utf-8');
  const match = content.match(/^NGL_DEV_GRANT_SECRET=(.+)$/m);
  if (!match || !match[1].trim()) {
    console.error('ERROR: NGL_DEV_GRANT_SECRET not found in server/.env');
    process.exit(1);
  }
  return match[1].trim();
}

async function main() {
  const [,, action, username, daysArg] = process.argv;
  const apiBase = process.env.DEV_API_BASE || 'http://localhost:5000';

  if (!action || !username) {
    console.log(`
  NGL PRO Dev Tool
  ────────────────
  Usage:
    node scripts/dev-pro.cjs grant  <username> [days]   Grant PRO (default: 30 days)
    node scripts/dev-pro.cjs revoke <username>           Remove PRO
    node scripts/dev-pro.cjs status <username>           Check PRO status

  Target: ${apiBase}  (set DEV_API_BASE to change)
`);
    process.exit(0);
  }

  const secret = loadSecret();
  const cleanUser = username.toLowerCase().replace(/^@/, '');

  if (action === 'status') {
    const res = await fetch(`${apiBase}/api/ngl/u/${cleanUser}`);
    if (!res.ok) { console.log(`User @${cleanUser} not found.`); return; }
    const data = await res.json();
    console.log(`\n  @${cleanUser}`);
    console.log(`  PRO: ${data.isPremium ? 'YES' : 'NO'}`);
    if (data.premiumUntil) console.log(`  Until: ${new Date(data.premiumUntil).toLocaleDateString()}`);
    console.log('');
    return;
  }

  if (action === 'grant') {
    const days = parseInt(daysArg) || 30;
    const res = await fetch(`${apiBase}/api/ngl/payment/dev-grant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Dev-Grant': secret },
      body: JSON.stringify({ username: cleanUser, plan: 'monthly', days }),
    });
    const data = await res.json();
    if (data.success) {
      console.log(`\n  PRO GRANTED to @${cleanUser} for ${days} days`);
      console.log(`  Expires: ${new Date(data.premiumUntil).toLocaleDateString()}`);
      console.log(`  Mode: ${data.mode}\n`);
    } else {
      console.error(`  FAILED: ${data.message}`);
    }
    return;
  }

  if (action === 'revoke') {
    const res = await fetch(`${apiBase}/api/ngl/payment/dev-revoke`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Dev-Grant': secret },
      body: JSON.stringify({ username: cleanUser }),
    });
    const data = await res.json();
    if (data.success) {
      console.log(`\n  PRO REVOKED from @${cleanUser}\n`);
    } else {
      console.error(`  FAILED: ${data.message}`);
    }
    return;
  }

  console.error(`Unknown action: ${action}. Use grant, revoke, or status.`);
}

main().catch(err => { console.error('Error:', err.message); process.exit(1); });
