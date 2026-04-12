/**
 * Create OTP Authentication Template + Send Test Message
 * 
 * Usage: node create_otp_template.cjs
 */
const https = require('https');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
require('dotenv').config({ path: path.resolve(__dirname, 'server', '.env') });

const TOKEN = process.env.META_WABA_TOKEN;
const WABA_ID = process.env.META_WABA_ID || '2124935384968157';
const PHONE_ID = process.env.META_WABA_PHONE_ID || '986490857891592';

function apiCall(method, apiPath, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = body ? JSON.stringify(body) : '';
    const options = {
      hostname: 'graph.facebook.com',
      port: 443,
      path: `/v22.0/${apiPath}`,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN}`,
        ...(body ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {}),
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (c) => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(bodyStr);
    req.end();
  });
}

async function main() {
  const action = process.argv[2] || 'all';

  // Step 1: Create OTP template
  if (action === 'all' || action === 'template') {
    console.log('📋 Creating OTP Authentication Template...');
    console.log('   WABA ID:', WABA_ID);
    
    const templateRes = await apiCall('POST', `${WABA_ID}/message_templates`, {
      name: 'bong_ngl_otp',
      category: 'AUTHENTICATION',
      allow_category_change: true,
      language: 'en',
      components: [
        {
          type: 'BODY',
          add_security_recommendation: true,
        },
        {
          type: 'FOOTER',
          code_expiration_minutes: 5,
        },
        {
          type: 'BUTTONS',
          buttons: [
            {
              type: 'OTP',
              otp_type: 'COPY_CODE',
              text: 'Copy Code',
            }
          ]
        }
      ]
    });

    console.log(`   Response [${templateRes.status}]:`, JSON.stringify(templateRes.data, null, 2));
    
    if (templateRes.status === 200 && templateRes.data.id) {
      console.log('\n✅ Template created! ID:', templateRes.data.id);
      console.log('   Status:', templateRes.data.status);
      console.log('   Note: Authentication templates are usually approved within minutes.');
    } else if (templateRes.data?.error?.error_user_msg) {
      console.log('\n⚠️', templateRes.data.error.error_user_msg);
    } else if (templateRes.data?.error?.message?.includes('already exists')) {
      console.log('\n✅ Template already exists — good!');
    }
  }

  // Step 2: Check existing templates
  if (action === 'all' || action === 'list') {
    console.log('\n📋 Listing existing templates...');
    const listRes = await apiCall('GET', `${WABA_ID}/message_templates?fields=name,status,category,language&limit=20`, null);
    
    if (listRes.status === 200 && listRes.data.data) {
      console.log(`   Found ${listRes.data.data.length} template(s):`);
      for (const t of listRes.data.data) {
        const icon = t.status === 'APPROVED' ? '✅' : t.status === 'PENDING' ? '⏳' : '❌';
        console.log(`   ${icon} ${t.name} [${t.category}] — ${t.status} (${t.language})`);
      }
    } else {
      console.log('   Response:', JSON.stringify(listRes.data, null, 2));
    }
  }

  // Step 3: Send test OTP (only if template is approved)
  if (action === 'send') {
    const recipient = process.argv[3] || '918777849865';
    const otpCode = String(Math.floor(100000 + Math.random() * 900000));
    
    console.log(`\n📱 Sending OTP ${otpCode} to ${recipient}...`);
    
    const sendRes = await apiCall('POST', `${PHONE_ID}/messages`, {
      messaging_product: 'whatsapp',
      to: recipient,
      type: 'template',
      template: {
        name: 'bong_ngl_otp',
        language: { code: 'en' },
        components: [
          {
            type: 'body',
            parameters: [{ type: 'text', text: otpCode }]
          },
          {
            type: 'button',
            sub_type: 'url',
            index: 0,
            parameters: [{ type: 'text', text: otpCode }]
          }
        ]
      }
    });

    console.log(`   Response [${sendRes.status}]:`, JSON.stringify(sendRes.data, null, 2));
    
    if (sendRes.status === 200 && sendRes.data.messages?.[0]?.id) {
      console.log(`\n✅ OTP sent! Code: ${otpCode}`);
      console.log('   Message ID:', sendRes.data.messages[0].id);
      console.log('   Check your WhatsApp! 🎉');
    } else {
      console.log('\n❌ Send failed. Check error above.');
      if (sendRes.data?.error?.code === 132015) {
        console.log('   → Template not approved yet. Wait a few minutes and retry.');
      }
    }
  }
}

main().catch(console.error);
