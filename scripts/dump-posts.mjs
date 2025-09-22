import { neon } from '@neondatabase/serverless';
import 'dotenv/config';
const sql = neon(process.env.DATABASE_URL);
const rows = await sql`SELECT id, text FROM community_posts`;
console.log(rows);
