import dotenv from 'dotenv';
import path from 'path';

// Load environment variables as early as possible
// We prioritize the root .env file as it is the single source of truth for the project
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
// Fallback to server/.env if it exists
dotenv.config({ path: path.resolve(process.cwd(), 'server', '.env') });

// Ensure DATABASE_URL is available for other modules
export const DATABASE_URL = process.env.DATABASE_URL;
export const PORT = process.env.PORT || '5000';
export const NODE_ENV = process.env.NODE_ENV || 'development';

console.log('[env] DATABASE_URL loaded:', !!DATABASE_URL);
console.log('[env] PORT:', PORT);
console.log('[env] NODE_ENV:', NODE_ENV);