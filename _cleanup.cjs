const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const dbUrl = fs.readFileSync('server/.env', 'utf8').match(/DATABASE_URL=(.+)/)?.[1]?.trim();
const sql = neon(dbUrl);
sql`DELETE FROM ngl_users WHERE username = 'otptest99'`.then(() => console.log('Deleted otptest99')).catch(e => console.error(e));
