// Migrate Neon DB to match Drizzle schema (add missing columns)
const { neon } = require('@neondatabase/serverless');
const sql = neon('postgresql://neondb_owner:npg_tnZHhjiP0c9s@ep-snowy-rain-adu1hltp-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function run() {
  // 1) Check existing columns
  const msgCols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'ngl_messages'`;
  const userCols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'ngl_users'`;
  const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE 'ngl%'`;
  
  console.log('NGL tables:', tables.map(r => r.table_name).join(', '));
  console.log('ngl_messages columns:', msgCols.map(r => r.column_name).join(', '));
  console.log('ngl_users columns:', userCols.map(r => r.column_name).join(', '));
  
  // 2) Add missing columns to ngl_messages
  const msgExisting = new Set(msgCols.map(r => r.column_name));
  const msgNeeded = [
    { col: 'sender_browser', type: 'VARCHAR(80)' },
    { col: 'sender_os', type: 'VARCHAR(80)' },
    { col: 'sender_city', type: 'VARCHAR(100)' },
    { col: 'sender_region', type: 'VARCHAR(100)' },
    { col: 'sender_country', type: 'VARCHAR(80)' },
    { col: 'sender_isp', type: 'VARCHAR(120)' },
    { col: 'sender_screen_res', type: 'VARCHAR(30)' },
    { col: 'sender_connection_type', type: 'VARCHAR(30)' },
    { col: 'sender_battery_level', type: 'VARCHAR(20)' },
    { col: 'sender_dark_mode', type: 'VARCHAR(10)' },
    { col: 'sender_referrer', type: 'VARCHAR(200)' },
    { col: 'sender_local_time', type: 'VARCHAR(30)' },
    { col: 'sender_fingerprint', type: 'VARCHAR(64)' },
    { col: 'pinned', type: 'INTEGER NOT NULL DEFAULT 0' },
    { col: 'reaction', type: 'VARCHAR(10)' },
  ];
  
  for (const { col, type } of msgNeeded) {
    if (!msgExisting.has(col)) {
      console.log(`  Adding ngl_messages.${col}...`);
      await sql(`ALTER TABLE ngl_messages ADD COLUMN IF NOT EXISTS ${col} ${type}`);
    }
  }
  
  // 3) Add missing columns to ngl_users
  const userExisting = new Set(userCols.map(r => r.column_name));
  const userNeeded = [
    { col: 'is_premium', type: 'INTEGER NOT NULL DEFAULT 0' },
    { col: 'premium_until', type: 'TIMESTAMP' },
  ];
  
  for (const { col, type } of userNeeded) {
    if (!userExisting.has(col)) {
      console.log(`  Adding ngl_users.${col}...`);
      await sql(`ALTER TABLE ngl_users ADD COLUMN IF NOT EXISTS ${col} ${type}`);
    }
  }
  
  // 4) Create ngl_blocked_fingerprints table if missing
  const tableNames = new Set(tables.map(r => r.table_name));
  if (!tableNames.has('ngl_blocked_fingerprints')) {
    console.log('  Creating ngl_blocked_fingerprints table...');
    await sql`CREATE TABLE IF NOT EXISTS ngl_blocked_fingerprints (
      id VARCHAR(60) PRIMARY KEY,
      recipient_username VARCHAR(20) NOT NULL REFERENCES ngl_users(username) ON DELETE CASCADE,
      fingerprint_hash VARCHAR(64) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )`;
  }
  
  // 5) Verify
  const msgColsAfter = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'ngl_messages'`;
  const userColsAfter = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'ngl_users'`;
  console.log('\n=== AFTER MIGRATION ===');
  console.log('ngl_messages columns:', msgColsAfter.map(r => r.column_name).join(', '));
  console.log('ngl_users columns:', userColsAfter.map(r => r.column_name).join(', '));
  console.log('\nDONE');
}

run().catch(e => { console.error('Migration error:', e); process.exit(1); });
