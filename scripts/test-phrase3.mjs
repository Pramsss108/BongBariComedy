// Phrase 3 Auto-Test: Sentiment Detection + Context-Aware Vocabulary Engine
// Run: node --loader tsx scripts/test-phrase3.mjs
// (Uses tsx to import TypeScript directly)

import { detectSentiment, applyVocabularyEngine, forceBurstiness, computeBurstiness, computeCliche } from '../server/utils/nlp.ts';

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

// ─── Sentiment Detection Tests ─────────────────────────────────────

test('Detect HAPPY sentiment', () => {
  const s = detectSentiment('I am so happy and excited about this amazing wonderful day, it was fantastic and brilliant!');
  assert(s === 'happy', `Expected happy, got ${s}`);
});

test('Detect SAD sentiment', () => {
  const s = detectSentiment('This tragic loss has caused devastating grief and sorrow for everyone who suffered through it.');
  assert(s === 'sad', `Expected sad, got ${s}`);
});

test('Detect PROFESSIONAL sentiment', () => {
  const s = detectSentiment('The quarterly revenue strategy and stakeholder compliance framework requires implementation and governance.');
  assert(s === 'professional', `Expected professional, got ${s}`);
});

test('Detect NEUTRAL sentiment (no strong signals)', () => {
  const s = detectSentiment('The cat sat on the mat and looked outside.');
  assert(s === 'neutral', `Expected neutral, got ${s}`);
});

test('Neutral for single keyword (below 2-hit threshold)', () => {
  const s = detectSentiment('This was a happy moment.');
  assert(s === 'neutral', `Expected neutral (only 1 hit), got ${s}`);
});

// ─── Vocabulary Engine + Sentiment Overlay Tests ────────────────────

test('HAPPY sentiment swaps "crucial" to happy words', () => {
  // Force happy sentiment to test the overlay
  const result = applyVocabularyEngine('This is a crucial step to elevate our project.', 'casual', 'happy');
  assert(!result.includes('crucial'), `"crucial" was NOT swapped: ${result}`);
  // Should NOT contain the base synonyms (key/important/vital/main) but happy ones (exciting/wonderful/fantastic)
  const hasHappyWord = /exciting|wonderful|fantastic/i.test(result);
  assert(hasHappyWord, `Expected happy overlay word, got: ${result}`);
});

test('SAD sentiment swaps "crucial" to sad words', () => {
  const result = applyVocabularyEngine('This is a crucial moment to foster healing.', 'casual', 'sad');
  assert(!result.includes('crucial'), `"crucial" was NOT swapped: ${result}`);
  const hasSadWord = /painful|hard|difficult/i.test(result);
  assert(hasSadWord, `Expected sad overlay word, got: ${result}`);
});

test('PROFESSIONAL sentiment swaps "robust" to professional words', () => {
  const result = applyVocabularyEngine('We need a robust system to foster growth.', 'casual', 'professional');
  assert(!result.includes('robust'), `"robust" was NOT swapped: ${result}`);
  const hasProfWord = /scalable|reliable|enterprise-grade/i.test(result);
  assert(hasProfWord, `Expected professional overlay word, got: ${result}`);
});

test('NEUTRAL falls back to base synonyms', () => {
  const result = applyVocabularyEngine('We must delve into this robust paradigm.', 'casual', 'neutral');
  assert(!result.includes('delve'), `"delve" was NOT swapped: ${result}`);
  assert(!result.includes('paradigm'), `"paradigm" was NOT swapped: ${result}`);
});

test('Backward compatible: no sentimentOverride still works', () => {
  const result = applyVocabularyEngine('We must utilize this holistic approach.', 'casual');
  assert(!result.includes('utilize'), `"utilize" was NOT swapped: ${result}`);
  assert(!result.includes('holistic'), `"holistic" was NOT swapped: ${result}`);
});

// ─── Existing Functions Still Work ──────────────────────────────────

test('forceBurstiness still works', () => {
  const input = 'AI wrote this. It was monotone. Short. Short. Short. This is a much longer sentence that keeps going and going, and eventually it should get split by the engine.';
  const result = forceBurstiness(input);
  assert(typeof result === 'string' && result.length > 0, 'forceBurstiness returned empty');
});

test('computeBurstiness returns number 0-100', () => {
  const score = computeBurstiness('Short one. This is a much much much longer sentence with many words in it.');
  assert(typeof score === 'number' && score >= 0 && score <= 100, `Bad score: ${score}`);
});

test('computeCliche detects AI phrases', () => {
  const result = computeCliche('In conclusion, we must delve into the tapestry of this paradigm shift.');
  assert(result.count >= 2, `Expected >= 2 cliches, got ${result.count}`);
});

// ─── Summary ────────────────────────────────────────────────────────

console.log(`\n🏁 Phrase 3 tests: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
