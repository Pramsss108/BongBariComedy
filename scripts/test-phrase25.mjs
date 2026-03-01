// Quick auto-test for Phrase 2.5: Device Lock Verification
// Run: node scripts/test-phrase25.mjs

const API = 'http://localhost:5000';

async function test(name, fn) {
  try {
    const result = await fn();
    console.log(`✅ ${name}: PASSED`, result);
  } catch (e) {
    console.log(`❌ ${name}: FAILED —`, e.message);
  }
}

async function run() {
  // Test 1: Server is alive
  await test('Server health', async () => {
    const r = await fetch(`${API}/api/version`);
    if (!r.ok) throw new Error(`Status ${r.status}`);
    return await r.json();
  });

  // Test 2: Humanizer rejects unauthenticated requests (expect 401)
  await test('Auth lockdown (no token → 401)', async () => {
    const r = await fetch(`${API}/api/humanize/groq`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'This is a test sentence for the humanizer.' })
    });
    if (r.status !== 401) throw new Error(`Expected 401, got ${r.status}`);
    const d = await r.json();
    return `${r.status} — ${d.error}`;
  });

  // Test 3: Humanizer rejects bad token (expect 401)
  await test('Auth lockdown (bad token → 401)', async () => {
    const r = await fetch(`${API}/api/humanize/groq`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer fake-invalid-token-12345'
      },
      body: JSON.stringify({ prompt: 'This is a test.' })
    });
    if (r.status !== 401) throw new Error(`Expected 401, got ${r.status}`);
    const d = await r.json();
    return `${r.status} — ${d.error}`;
  });

  // Test 4: Endpoint exists and responds (not 404)
  await test('Endpoint exists (not 404)', async () => {
    const r = await fetch(`${API}/api/humanize/groq`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'test' })
    });
    if (r.status === 404) throw new Error('Endpoint not found');
    return `Endpoint responded with ${r.status} (expected 401)`;
  });

  console.log('\n🏁 Phrase 2.5 auto-tests complete.');
}

run();
