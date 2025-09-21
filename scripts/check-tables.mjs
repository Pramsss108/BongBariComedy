import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const sql = neon(process.env.DATABASE_URL);
const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`;
console.log('Tables:', tables.map(t => t.table_name));