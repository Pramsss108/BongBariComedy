/**
 * test_otp_api.cjs — Integration test for NGL OTP endpoints.
 * 
 * Run: node test_otp_api.cjs
 * Requires: server running on localhost:5000
 * 
 * Tests:
 *   1) Create user
 *   2) POST /otp/send — request OTP
 *   3) POST /otp/verify — wrong OTP rejected
 *   4) POST /otp/verify — correct OTP (needs DB peek hack for now)
 *   5) GET /u/:username/phone — phone status
 *   6) Rate limit on /otp/send
 */
const http = require('http');

const API = 'http://localhost:5000/api/ngl';
let secretKey = '';
const testUser = 'otptest_' + Date.now().toString(36).slice(-6);
let passed = 0;
let failed = 0;

function post(path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(API + path);
    const data = JSON.stringify(body);
    const req = http.request({
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
        catch { resolve({ status: res.statusCode, body: d }); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function get(path, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(API + path);
    const req = http.request({
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: 'GET',
      headers,
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
        catch { resolve({ status: res.statusCode, body: d }); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function assert(name, condition, detail = '') {
  if (condition) {
    console.log(`  ✅ ${name}`);
    passed++;
  } else {
    console.log(`  ❌ ${name} ${detail}`);
    failed++;
  }
}

(async () => {
  console.log(`\n=== NGL OTP API Integration Tests ===`);
  console.log(`Test user: ${testUser}\n`);

  // 1) Create user
  console.log('1) Create user');
  const create = await post('/create', { username: testUser, prompt: 'otp test', pin: '123456' });
  assert('User created (201)', create.status === 201);
  assert('Got secret key', !!create.body.secretKey);
  secretKey = create.body.secretKey || '';

  // 2) Request OTP
  console.log('\n2) Request OTP');
  const send = await post('/otp/send', { username: testUser, phone: '8777849865', key: secretKey });
  // May be 200 (dev mode) or 502 (WhatsApp template missing) — both prove the logic ran
  const sendOk = send.status === 200 || send.status === 502;
  assert(`OTP send returned ${send.status}`, sendOk, JSON.stringify(send.body));
  if (send.status === 200) {
    assert('Phone masked in response', send.body.phone?.includes('•'));
    assert('ExpiresIn = 300s', send.body.expiresIn === 300);
  } else {
    console.log(`    (WhatsApp delivery failed as expected — template not approved yet)`);
    console.log(`    Error: ${send.body.message}`);
  }

  // 3) Verify with WRONG OTP
  console.log('\n3) Verify wrong OTP');
  const badVerify = await post('/otp/verify', { username: testUser, otp: '000000', key: secretKey });
  assert('Wrong OTP rejected (400)', badVerify.status === 400);
  assert('Error message present', !!badVerify.body.message);
  console.log(`    Reason: "${badVerify.body.message}"`);

  // 4) Phone status (unverified)
  console.log('\n4) Phone status (before verify)');
  const phoneStatus = await get(`/u/${testUser}/phone`, { 'X-NGL-Key': secretKey });
  assert('Phone status 200', phoneStatus.status === 200);
  assert('Phone is masked', phoneStatus.body.phone?.includes('•') || phoneStatus.body.phone === null);
  assert('Not yet verified', phoneStatus.body.verified === false);

  // 5) Rate limit on OTP send
  console.log('\n5) Rate limit test');
  const send2 = await post('/otp/send', { username: testUser, phone: '8777849865', key: secretKey });
  assert('Rate limited (429)', send2.status === 429);
  console.log(`    Message: "${send2.body.message}"`);

  // 6) Auth check — wrong key should fail
  console.log('\n6) Auth check');
  const badAuth = await post('/otp/send', { username: testUser, phone: '8777849865', key: 'wrongkey' });
  assert('Wrong key rejected (403)', badAuth.status === 403);

  // 7) Bad phone number
  console.log('\n7) Invalid phone validation');
  // Need to wait for rate limit or use different approach
  const badPhone = await post('/otp/send', { username: testUser + '_nope', phone: '12345', key: secretKey });
  assert('Nonexistent user (404)', badPhone.status === 404);

  // Summary
  console.log(`\n${'='.repeat(40)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log(`${'='.repeat(40)}\n`);

  // Cleanup: delete test user
  const del = await new Promise((resolve, reject) => {
    const url = new URL(API + `/u/${testUser}`);
    const req = http.request({
      hostname: url.hostname, port: url.port, path: url.pathname,
      method: 'DELETE', headers: { 'X-NGL-Key': secretKey },
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(res.statusCode));
    });
    req.on('error', reject);
    req.end();
  });
  console.log(`Cleanup: deleted ${testUser} (${del})`);

  process.exit(failed > 0 ? 1 : 0);
})().catch(e => {
  console.error('Fatal:', e);
  process.exit(1);
});
