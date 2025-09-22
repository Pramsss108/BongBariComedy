import { neon } from '@neondatabase/serverless';
import 'dotenv/config';
const sql = neon(process.env.DATABASE_URL);
const rows = await sql`SELECT * FROM community_reactions`;
console.log(rows);
