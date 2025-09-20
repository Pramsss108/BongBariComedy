#!/usr/bin/env node
// Simple Neon PostgreSQL connectivity + schema sanity check.
// Usage:
//   node scripts/db-check.mjs            (uses .env / server/.env)
//   DATABASE_URL=... node scripts/db-check.mjs
// Exits 0 on success, 1 on failure.
import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('[db-check] DATABASE_URL missing');
    process.exit(1);
  }
  const sql = neon(url);
  const start = Date.now();
  try {
    // Round trip check
    const one = await sql`select 1 as ok`;
    // Count a couple of known tables (ignore if they do not exist yet)
    const tableNames = ['users','blog_posts','collaboration_requests'];
    const counts = {};
    for (const t of tableNames) {
      try {
        const r = await sql`select count(*)::int as count from ${sql(t)}`;
        counts[t] = r[0].count;
      } catch {
        counts[t] = 'missing';
      }
    }
    // How many public tables total
    const tables = await sql`select count(*)::int as count from information_schema.tables where table_schema = 'public'`;
    const duration = Date.now() - start;
    console.log(JSON.stringify({ ok: true, latencyMs: duration, select1: one[0].ok, tableCounts: counts, publicTables: tables[0].count }, null, 2));
    process.exit(0);
  } catch (e) {
    const duration = Date.now() - start;
    console.error(JSON.stringify({ ok: false, latencyMs: duration, error: e.message }, null, 2));
    process.exit(1);
  }
}

main();
