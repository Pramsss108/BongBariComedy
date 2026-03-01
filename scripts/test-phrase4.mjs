// Phrase 4 Auto-Test: Semantic Cloaking (Active/Passive Voice Reversal)
// Run: npx tsx scripts/test-phrase4.mjs

import { applySemanticCloaking, forceBurstiness, applyVocabularyEngine, applyHumanFlaws, computeBurstiness, computeCliche, detectSentiment } from '../server/utils/nlp.ts';

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (e) {
    console.log(`❌ ${name} — ${e.message}`);
    failed++;
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg);
}

// ─── Semantic Cloaking Tests ────────────────────────────────────────

test('Returns string (does not crash)', () => {
  const result = applySemanticCloaking('The team built the product. The company launched the service quickly.');
  assert(typeof result === 'string' && result.length > 0, `Got empty or non-string: ${result}`);
});

test('Does not destroy short text (< 2 sentences)', () => {
  const input = 'Hello world.';
  const result = applySemanticCloaking(input);
  assert(result === input, `Short text was modified: ${result}`);
});

test('Handles passive sentence (was + verb + by)', () => {
  // Run 50 times to hit the 30% probability at least once
  let flipped = false;
  for (let i = 0; i < 50; i++) {
    const result = applySemanticCloaking('The product was built by the team. The service was launched by the company. The code was written by the developer.');
    // If any sentence lost "was...by" pattern, it was flipped to active
    if (!result.includes('was built by') || !result.includes('was launched by') || !result.includes('was written by')) {
      flipped = true;
      break;
    }
  }
  assert(flipped, 'Passive→Active never triggered in 50 runs (statistically very unlikely)');
});

test('Handles active sentence (subject + verb + object)', () => {
  let flipped = false;
  for (let i = 0; i < 50; i++) {
    const result = applySemanticCloaking('The engineers designed the system. The manager approved the budget. The artist painted the mural.');
    // If any sentence gained "was...by" pattern, it was flipped to passive
    if (result.includes('was ') && result.includes(' by ')) {
      flipped = true;
      break;
    }
  }
  assert(flipped, 'Active→Passive never triggered in 50 runs (statistically very unlikely)');
});

test('Does not crash on questions', () => {
  const result = applySemanticCloaking('What did you do? Where are we going? This is fine.');
  assert(typeof result === 'string', 'Crashed on questions');
});

test('Does not crash on empty string', () => {
  const result = applySemanticCloaking('');
  assert(typeof result === 'string', 'Crashed on empty string');
});

test('Preserves meaning (does not add random content)', () => {
  const input = 'The cat chased the mouse. The dog found the bone. The bird built the nest.';
  const result = applySemanticCloaking(input);
  // Result should still contain core nouns
  const lower = result.toLowerCase();
  assert(lower.includes('cat') || lower.includes('mouse'), `Lost cat/mouse: ${result}`);
  assert(lower.includes('dog') || lower.includes('bone'), `Lost dog/bone: ${result}`);
});

// ─── Full Pipeline Integration Test ─────────────────────────────────

test('Full pipeline: burstiness → vocab → cloaking → flaws (no crash)', () => {
  let text = 'Furthermore, it is crucial to delve into this robust paradigm. Moreover, we must foster a holistic approach to elevate our understanding. The team built the product seamlessly.';
  text = forceBurstiness(text);
  text = applyVocabularyEngine(text, 'casual');
  text = applySemanticCloaking(text);
  text = applyHumanFlaws(text, 'low');
  assert(typeof text === 'string' && text.length > 20, `Pipeline produced bad output: ${text}`);
  // AI cliches should be mostly gone
  const cliches = computeCliche(text);
  console.log(`   └─ Post-pipeline cliches: ${cliches.count}, burstiness: ${computeBurstiness(text)}`);
});

// ─── Phrase 3 regression (still works) ──────────────────────────────

test('Phrase 3 regression: detectSentiment still works', () => {
  assert(detectSentiment('happy excited amazing wonderful joy') === 'happy', 'Happy detection broken');
  assert(detectSentiment('tragic loss grief sorrow pain') === 'sad', 'Sad detection broken');
});

// ─── Summary ────────────────────────────────────────────────────────

console.log(`\n🏁 Phrase 4 tests: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
