// One-shot script to create NGL tables in Neon Postgres
require('dotenv').config({ path: 'server/.env' });
const { neon } = require('@neondatabase/serverless');

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL not found in server/.env');
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

async function run() {
  console.log('Creating NGL tables...');

  await sql`CREATE TABLE IF NOT EXISTS ngl_users (
    username VARCHAR(20) PRIMARY KEY,
    prompt TEXT NOT NULL DEFAULT 'send me anonymous messages!',
    secret_key_hash VARCHAR(64) NOT NULL,
    message_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
  )`;
  console.log('✅ ngl_users table created');

  await sql`CREATE TABLE IF NOT EXISTS ngl_messages (
    id VARCHAR(60) PRIMARY KEY,
    recipient_username VARCHAR(20) NOT NULL REFERENCES ngl_users(username) ON DELETE CASCADE,
    text TEXT NOT NULL,
    emoji VARCHAR(10) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
  )`;
  console.log('✅ ngl_messages table created');

  // Verify
  const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_name LIKE 'ngl%'`;
  console.log('Tables in DB:', tables.map(t => t.table_name));
  console.log('Done!');
}

run().catch(e => { console.error('Error:', e.message); process.exit(1); });
