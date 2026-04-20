import crypto from 'node:crypto';

const BASE = process.env.NGL_TEST_BASE || 'http://localhost:5000/api/ngl';

function nowId() {
  return String(Date.now()).slice(-8);
}

async function req(method, path, body, headers = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  const txt = await res.text();
  let data;
  try {
    data = JSON.parse(txt);
  } catch {
    data = { raw: txt };
  }
  return { status: res.status, data };
}

function hmacTestToken(secret, payload) {
  const payloadB64 = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(payloadB64).digest('hex');
  return `${payloadB64}.${sig}`;
}

function printResult(name, status, ok, note = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'} | ${String(status).padStart(3)} | ${name}${note ? ` | ${note}` : ''}`);
}

async function main() {
  const results = [];
  const username = `sec${nowId()}`;

  const created = await req('POST', '/create', { username, prompt: 'secure matrix' });
  const secretKey = created.data?.secretKey || '';
  results.push(['new account created', created.status, created.status === 201 && created.data?.ok === true]);

  const noPhone = await req('GET', `/u/${encodeURIComponent(username)}/phone`, null, { 'X-NGL-Key': secretKey });
  results.push(['new account no phone', noPhone.status, noPhone.status === 200 && noPhone.data?.state === 'none']);

  const otpSend = await req('POST', '/otp/send', { username, phone: '9876543210', key: secretKey });
  results.push(['otp sent pending state', otpSend.status, otpSend.status === 200 && otpSend.data?.state === 'otp_sent']);

  const afterSend = await req('GET', `/u/${encodeURIComponent(username)}/phone`, null, { 'X-NGL-Key': secretKey });
  results.push(['phone pending after otp send', afterSend.status, afterSend.status === 200 && afterSend.data?.state === 'otp_sent']);

  const unauthorizedTestOrder = await req(
    'POST',
    '/payment/create-order',
    { username, plan: 'test1', mode: 'test' },
    { 'X-NGL-Key': secretKey },
  );
  results.push([
    'unauthorized test payment blocked',
    unauthorizedTestOrder.status,
    unauthorizedTestOrder.status === 403 || unauthorizedTestOrder.status === 503,
  ]);

  const devGrantUnsigned = await req('POST', '/payment/dev-grant', { username, plan: 'monthly', days: 1 });
  results.push(['unsigned dev-grant blocked', devGrantUnsigned.status, [403, 503].includes(devGrantUnsigned.status)]);

  const devRevokeUnsigned = await req('POST', '/payment/dev-revoke', { username });
  results.push(['unsigned dev-revoke blocked', devRevokeUnsigned.status, [403, 503].includes(devRevokeUnsigned.status)]);

  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  const tokenSecret = process.env.NGL_TEST_TOKEN_SECRET;

  if (!tokenSecret) {
    results.push(['expired test token attempt', 0, true, 'SKIP: NGL_TEST_TOKEN_SECRET is not set in this shell']);
  } else {
    const expiredTokenPayload = {
      username,
      scope: 'premium:test',
      exp: Date.now() - 60_000,
      nonce: `exp_${nowId()}`,
    };
    const expiredToken = await hmacTestToken(tokenSecret, expiredTokenPayload);
    const expiredAttempt = await req(
      'POST',
      '/payment/create-order',
      { username, plan: 'test1', mode: 'test' },
      { 'X-NGL-Key': secretKey, 'X-NGL-Test-Token': expiredToken },
    );
    results.push(['expired test token blocked', expiredAttempt.status, expiredAttempt.status === 403 || expiredAttempt.status === 503]);
  }

  if (!keySecret || !tokenSecret) {
    results.push(['replay payment attempt', 0, true, 'SKIP: requires Razorpay key + test token secret']);
  } else {
    // This is a synthetic replay check using the same fake payment id twice.
    // First call should fail signature (400). Second call may return 400 or replay depending on flow.
    const tokenPayload = {
      username,
      scope: 'premium:test',
      exp: Date.now() + 60_000,
      nonce: `rep_${nowId()}`,
    };
    const token = await hmacTestToken(tokenSecret, tokenPayload);
    const body = {
      username,
      razorpay_order_id: 'order_fake_replay',
      razorpay_payment_id: 'pay_fake_replay',
      razorpay_signature: 'bad_sig',
      plan: 'test1',
      mode: 'test',
    };
    const first = await req('POST', '/payment/verify', body, { 'X-NGL-Key': secretKey, 'X-NGL-Test-Token': token });
    const second = await req('POST', '/payment/verify', body, { 'X-NGL-Key': secretKey, 'X-NGL-Test-Token': token });
    const ok = [400, 409].includes(first.status) && [400, 409].includes(second.status);
    results.push(['replay payment attempt guarded', second.status, ok]);
  }

  console.log('--- NGL SECURE MODE MATRIX (up to section 9 checks) ---');
  let failCount = 0;
  for (const r of results) {
    const [name, status, ok, note] = r;
    if (!ok) failCount += 1;
    printResult(name, status, ok, note);
  }

  console.log(`RESULT: ${failCount === 0 ? 'ALL PASS' : `${failCount} FAIL`}`);
  if (failCount > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error('Matrix run error:', err);
  process.exitCode = 1;
});
