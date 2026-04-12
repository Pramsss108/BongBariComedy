const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Load DATABASE_URL from server/.env
const envPath = path.join(__dirname, 'server', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
let dbUrl = '';
for (const line of envContent.split('\n')) {
  const m = line.match(/^DATABASE_URL=(.+)/);
  if (m) { dbUrl = m[1].trim(); break; }
}
if (!dbUrl) { console.error('No DATABASE_URL found'); process.exit(1); }

const queries = [
  "ALTER TABLE ngl_users ADD COLUMN IF NOT EXISTS theme varchar(20) DEFAULT 'default'",
  "ALTER TABLE ngl_users ADD COLUMN IF NOT EXISTS photo text",
  "ALTER TABLE ngl_messages ADD COLUMN IF NOT EXISTS reaction varchar(10)",
  "ALTER TABLE ngl_messages ADD COLUMN IF NOT EXISTS sender_lang varchar(100)",
  "ALTER TABLE ngl_messages ADD COLUMN IF NOT EXISTS sender_tz varchar(100)",
  "ALTER TABLE ngl_messages ADD COLUMN IF NOT EXISTS sender_device varchar(50)",
];

async function main() {
  const c = new Client({ connectionString: dbUrl });
  await c.connect();
  for (const q of queries) {
    try {
      await c.query(q);
      console.log('OK:', q.slice(0, 70));
    } catch (e) {
      console.log('SKIP:', e.message.slice(0, 100));
    }
  }
  await c.end();
  console.log('DONE — all columns added');
}

main().catch(e => { console.error('FAIL:', e.message); process.exit(1); });
