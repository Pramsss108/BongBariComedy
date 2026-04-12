/**
 * WhatsApp Cloud API — Hello World Test
 * 
 * Usage:
 *   node test_whatsapp.cjs 919876543210
 *   (replace with YOUR WhatsApp number, starting with 91)
 * 
 * Or set META_WABA_TEST_RECIPIENT in .env and just run:
 *   node test_whatsapp.cjs
 */

const https = require('https');
const path = require('path');

// Load .env
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
require('dotenv').config({ path: path.resolve(__dirname, 'server', '.env') });

const PHONE_ID = process.env.META_WABA_PHONE_ID;
const TOKEN    = process.env.META_WABA_TOKEN;
const RECIPIENT = process.argv[2] || process.env.META_WABA_TEST_RECIPIENT;

if (!PHONE_ID || !TOKEN) {
  console.error('❌ Missing META_WABA_PHONE_ID or META_WABA_TOKEN in .env');
  process.exit(1);
}
if (!RECIPIENT || RECIPIENT === '91XXXXXXXXXX') {
  console.error('❌ Provide your WhatsApp number as argument:');
  console.error('   node test_whatsapp.cjs 919876543210');
  process.exit(1);
}

console.log('📱 Sending hello_world to', RECIPIENT, '...');
console.log('   Phone Number ID:', PHONE_ID);

const body = JSON.stringify({
  messaging_product: 'whatsapp',
  to: RECIPIENT,
  type: 'template',
  template: {
    name: 'hello_world',
    language: { code: 'en_US' }
  }
});

const options = {
  hostname: 'graph.facebook.com',
  port: 443,
  path: `/v22.0/${PHONE_ID}/messages`,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${TOKEN}`,
    'Content-Length': Buffer.byteLength(body),
  },
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    const status = res.statusCode;
    console.log(`\n📨 Response [${status}]:`);
    
    try {
      const json = JSON.parse(data);
      console.log(JSON.stringify(json, null, 2));

      if (status === 200 && json.messages && json.messages[0]?.id) {
        console.log('\n✅ SUCCESS! Message sent!');
        console.log('   Message ID:', json.messages[0].id);
        console.log('   Check your WhatsApp — you should see "Hello World" from Bong Bari! 🎉');
      } else if (json.error) {
        console.log('\n❌ ERROR:', json.error.message);
        if (json.error.code === 100) {
          console.log('   → Check that the recipient number is correct (include 91 country code)');
        }
        if (json.error.code === 190) {
          console.log('   → Token expired or invalid — regenerate in Business Settings → System Users');
        }
        if (json.error.error_subcode === 33) {
          console.log('   → Phone number not registered on WhatsApp');
        }
      }
    } catch {
      console.log(data);
    }
  });
});

req.on('error', (err) => {
  console.error('❌ Request failed:', err.message);
});

req.write(body);
req.end();
