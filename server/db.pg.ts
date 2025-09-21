import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../shared/schema';

if (!process.env.DATABASE_URL) {
  console.warn('[pg-db] DATABASE_URL not set; Postgres features disabled.');
}

export const pgSql = process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null;
export const pgDb = pgSql ? drizzle(pgSql, { schema }) : null as any;
