#!/usr/bin/env node
/**
 * Cloudflare DNS Auto-Update Script
 * 
 * Usage:
 *   node scripts/cf-dns.cjs update <subdomain> <ip>     # Update/create A record
 *   node scripts/cf-dns.cjs list                        # List all DNS records
 *   node scripts/cf-dns.cjs delete <subdomain>          # Delete a record
 * 
 * Examples:
 *   node scripts/cf-dns.cjs update api 158.101.175.37
 *   node scripts/cf-dns.cjs update www 185.199.108.153
 *   node scripts/cf-dns.cjs list
 * 
 * Setup (one-time):
 *   1. Go to https://dash.cloudflare.com/profile/api-tokens
 *   2. Click "Create Token" -> "Edit zone DNS" template
 *   3. Zone Resources: Include -> Specific zone -> bongbari.com
 *   4. Continue -> Create Token -> COPY the token
 *   5. Add to server/.env (or root .env):
 *        CLOUDFLARE_API_TOKEN=your_token_here
 *        CLOUDFLARE_ZONE=bongbari.com
 */

const fs = require('fs');
const path = require('path');

// Load .env
['server/.env', '.env'].forEach(p => {
  const fp = path.resolve(__dirname, '..', p);
  if (fs.existsSync(fp)) {
    fs.readFileSync(fp, 'utf8').split('\n').forEach(line => {
      const m = line.match(/^([A-Z_]+)=(.+)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    });
  }
});

const TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const ZONE_NAME = process.env.CLOUDFLARE_ZONE || 'bongbari.com';

if (!TOKEN) {
  console.error('❌ CLOUDFLARE_API_TOKEN missing in server/.env');
  console.error('   Get one at: https://dash.cloudflare.com/profile/api-tokens');
  console.error('   Use template: "Edit zone DNS" -> Zone: bongbari.com');
  process.exit(1);
}

const CF = 'https://api.cloudflare.com/client/v4';
const headers = {
  'Authorization': `Bearer ${TOKEN}`,
  'Content-Type': 'application/json',
};

async function cf(method, url, body) {
  const res = await fetch(CF + url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await res.json();
  if (!j.success) {
    console.error('❌ Cloudflare API error:', JSON.stringify(j.errors, null, 2));
    process.exit(1);
  }
  return j.result;
}

async function getZoneId() {
  const zones = await cf('GET', `/zones?name=${ZONE_NAME}`);
  if (!zones.length) {
    console.error(`❌ Zone "${ZONE_NAME}" not found in Cloudflare account.`);
    console.error('   Make sure you onboarded the domain to Cloudflare first.');
    process.exit(1);
  }
  return zones[0].id;
}

async function listRecords() {
  const zoneId = await getZoneId();
  const records = await cf('GET', `/zones/${zoneId}/dns_records?per_page=100`);
  console.log(`\n📋 DNS records for ${ZONE_NAME}:\n`);
  console.log('TYPE   NAME                              CONTENT                  PROXY');
  console.log('-'.repeat(85));
  records.forEach(r => {
    const proxy = r.proxied ? '🟠 ON' : '⚪ OFF';
    console.log(`${r.type.padEnd(6)} ${r.name.padEnd(33)} ${r.content.padEnd(24)} ${proxy}`);
  });
  console.log('');
}

async function updateRecord(subdomain, ip) {
  const zoneId = await getZoneId();
  const fullName = subdomain === '@' ? ZONE_NAME : `${subdomain}.${ZONE_NAME}`;
  const existing = await cf('GET', `/zones/${zoneId}/dns_records?name=${fullName}&type=A`);

  const payload = {
    type: 'A',
    name: subdomain,
    content: ip,
    ttl: 1,          // 1 = auto
    proxied: true,   // 🟠 orange cloud ON = free SSL + CDN + DDoS
  };

  if (existing.length) {
    const r = await cf('PUT', `/zones/${zoneId}/dns_records/${existing[0].id}`, payload);
    console.log(`✅ Updated ${r.name} -> ${r.content} (proxied: ${r.proxied})`);
  } else {
    const r = await cf('POST', `/zones/${zoneId}/dns_records`, payload);
    console.log(`✅ Created ${r.name} -> ${r.content} (proxied: ${r.proxied})`);
  }
  console.log(`   DNS propagates globally in ~30 seconds via Cloudflare.`);
}

async function deleteRecord(subdomain) {
  const zoneId = await getZoneId();
  const fullName = subdomain === '@' ? ZONE_NAME : `${subdomain}.${ZONE_NAME}`;
  const existing = await cf('GET', `/zones/${zoneId}/dns_records?name=${fullName}`);
  if (!existing.length) {
    console.log(`⚠️  No record found for ${fullName}`);
    return;
  }
  for (const r of existing) {
    await cf('DELETE', `/zones/${zoneId}/dns_records/${r.id}`);
    console.log(`🗑️  Deleted ${r.type} ${r.name} -> ${r.content}`);
  }
}

(async () => {
  const [cmd, arg1, arg2] = process.argv.slice(2);
  try {
    if (cmd === 'list') return await listRecords();
    if (cmd === 'update' && arg1 && arg2) return await updateRecord(arg1, arg2);
    if (cmd === 'delete' && arg1) return await deleteRecord(arg1);
    console.log('Usage:');
    console.log('  node scripts/cf-dns.cjs list');
    console.log('  node scripts/cf-dns.cjs update <subdomain> <ip>');
    console.log('  node scripts/cf-dns.cjs delete <subdomain>');
    console.log('\nExamples:');
    console.log('  node scripts/cf-dns.cjs update api 158.101.175.37');
    console.log('  node scripts/cf-dns.cjs list');
    process.exit(1);
  } catch (e) {
    console.error('❌', e.message);
    process.exit(1);
  }
})();
