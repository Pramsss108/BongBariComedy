const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const dbUrl = fs.readFileSync('server/.env', 'utf8').match(/DATABASE_URL=(.+)/)?.[1]?.trim();
const sql = neon(dbUrl);

(async () => {
  const rows = await sql`
    SELECT username, phone, phone_verified, 
           otp_hash IS NOT NULL as has_otp, 
           otp_expiry
    FROM ngl_users 
    WHERE username = 'otptest99'
  `;
  console.log('DB state:', JSON.stringify(rows, null, 2));
})().catch(e => console.error(e));
