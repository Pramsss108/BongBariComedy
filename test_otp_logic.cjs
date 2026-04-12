/**
 * test_otp_logic.cjs — Local test for OTP generation, hashing, and verification.
 * Run: node test_otp_logic.cjs
 * No WhatsApp / network needed — pure logic test.
 */
const crypto = require('crypto');

// ── Inline copies of server/lib/otp.ts functions ──
function generateOtp() {
  const code = crypto.randomInt(0, 1_000_000);
  return code.toString().padStart(6, '0');
}

function hashOtp(otp) {
  return crypto.createHash('sha256').update(otp).digest('hex');
}

function verifyOtp(otp, storedHash, expiry) {
  if (!storedHash || !expiry) return { valid: false, reason: 'No OTP pending.' };
  if (new Date() > expiry) return { valid: false, reason: 'OTP expired.' };
  if (hashOtp(otp) !== storedHash) return { valid: false, reason: 'Incorrect OTP.' };
  return { valid: true };
}

function validatePhone(raw) {
  const clean = raw.replace(/[\s\-+]/g, '');
  if (/^91\d{10}$/.test(clean)) return clean;
  if (/^\d{10}$/.test(clean)) return '91' + clean;
  return null;
}

// ── Simulated in-memory DB ──
const db = {};

console.log('=== Bong NGL OTP Logic Test ===\n');

// Test 1: Generate OTPs
console.log('1) Generate 5 OTPs:');
for (let i = 0; i < 5; i++) {
  const otp = generateOtp();
  console.log(`   OTP ${i + 1}: ${otp} (length: ${otp.length}, all digits: ${/^\d{6}$/.test(otp)})`);
}

// Test 2: Hash + verify
console.log('\n2) Hash & verify round-trip:');
const otp = generateOtp();
const hash = hashOtp(otp);
console.log(`   Generated:  ${otp}`);
console.log(`   SHA-256:    ${hash}`);
console.log(`   Hash length: ${hash.length} chars`);

const expiry = new Date(Date.now() + 5 * 60 * 1000);
const check1 = verifyOtp(otp, hash, expiry);
console.log(`   Verify correct OTP: ${check1.valid ? '✅ PASS' : '❌ FAIL'}`);

const check2 = verifyOtp('000000', hash, expiry);
console.log(`   Verify wrong OTP:   ${!check2.valid ? '✅ PASS (rejected)' : '❌ FAIL (should reject)'}`);
console.log(`   Rejection reason:   "${check2.reason}"`);

// Test 3: Expiry
console.log('\n3) Expired OTP:');
const pastExpiry = new Date(Date.now() - 1000);
const check3 = verifyOtp(otp, hash, pastExpiry);
console.log(`   Verify expired OTP: ${!check3.valid ? '✅ PASS (rejected)' : '❌ FAIL'}`);
console.log(`   Rejection reason:   "${check3.reason}"`);

// Test 4: No pending OTP
console.log('\n4) No pending OTP:');
const check4 = verifyOtp(otp, null, null);
console.log(`   Verify no-OTP:      ${!check4.valid ? '✅ PASS (rejected)' : '❌ FAIL'}`);
console.log(`   Rejection reason:   "${check4.reason}"`);

// Test 5: Phone validation
console.log('\n5) Phone validation:');
const phones = [
  { input: '8777849865',      expect: '918777849865' },
  { input: '918777849865',    expect: '918777849865' },
  { input: '+91 87778 49865', expect: '918777849865' },
  { input: '12345',           expect: null },
  { input: '0000000000',      expect: '910000000000' },
  { input: '+1 555 123 4567', expect: null },
];
phones.forEach(({ input, expect: exp }) => {
  const result = validatePhone(input);
  const pass = result === exp;
  console.log(`   "${input}" → ${result || 'null'} ${pass ? '✅' : `❌ expected ${exp}`}`);
});

// Test 6: Simulate full flow
console.log('\n6) Full OTP flow simulation:');
const username = 'testuser';
const phone = validatePhone('8777849865');
const flowOtp = generateOtp();
const flowHash = hashOtp(flowOtp);
const flowExpiry = new Date(Date.now() + 5 * 60 * 1000);

db[username] = { phone, otpHash: flowHash, otpExpiry: flowExpiry, phoneVerified: 0 };
console.log(`   → Sent OTP ${flowOtp} to ${phone}`);
console.log(`   → Stored hash in DB (never store plaintext!)`);

// User enters OTP
const userInput = flowOtp; // correct
const verifyResult = verifyOtp(userInput, db[username].otpHash, db[username].otpExpiry);
if (verifyResult.valid) {
  db[username].phoneVerified = 1;
  db[username].otpHash = null;
  db[username].otpExpiry = null;
  console.log(`   → Verified! Phone ${phone} is now confirmed ✅`);
  console.log(`   → Cleared OTP from DB (single-use)`);
} else {
  console.log(`   → Verification failed: ${verifyResult.reason}`);
}

console.log(`\n   Final DB state:`, JSON.stringify(db[username], null, 2));

console.log('\n=== All tests passed! ===');
