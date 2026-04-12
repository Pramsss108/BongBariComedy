/**
 * migrate_ngl_columns.cjs — Add missing columns to ngl_users table.
 * Run: node migrate_ngl_columns.cjs
 */
const { neon } = require('@neondatabase/serverless');
const fs = require('fs');

const envContent = fs.readFileSync('server/.env', 'utf8');
const dbUrl = envContent.match(/DATABASE_URL=(.+)/)?.[1]?.trim();
if (!dbUrl) { console.log('No DATABASE_URL found'); process.exit(1); }

const sql = neon(dbUrl);

(async () => {
  // Check current columns
  const cols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'ngl_users' ORDER BY ordinal_position`;
  console.log('Current columns:', cols.map(c => c.column_name).join(', '));

  // Columns to add (idempotent — IF NOT EXISTS)
  const migrations = [
    `ALTER TABLE ngl_users ADD COLUMN IF NOT EXISTS streak_days INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE ngl_users ADD COLUMN IF NOT EXISTS last_message_day VARCHAR(10)`,
    `ALTER TABLE ngl_users ADD COLUMN IF NOT EXISTS phone VARCHAR(15)`,
    `ALTER TABLE ngl_users ADD COLUMN IF NOT EXISTS phone_verified INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE ngl_users ADD COLUMN IF NOT EXISTS otp_hash VARCHAR(64)`,
    `ALTER TABLE ngl_users ADD COLUMN IF NOT EXISTS otp_expiry TIMESTAMP`,
  ];

  for (const ddl of migrations) {
    try {
      await sql(ddl);
      const colName = ddl.match(/ADD COLUMN IF NOT EXISTS (\S+)/)?.[1];
      console.log('  ✅', colName);
    } catch (e) {
      console.log('  ❌', e.message);
    }
  }

  // Verify final state
  const cols2 = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'ngl_users' ORDER BY ordinal_position`;
  console.log('\nFinal columns:', cols2.map(c => c.column_name).join(', '));
  console.log('Total:', cols2.length, 'columns');
})().catch(e => console.error('Fatal:', e));
