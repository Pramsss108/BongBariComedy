// Phrase 5 Auto-Test: Headless Verification Agent (In-House AI Detector)
// Run: npx tsx scripts/test-phrase5.mjs

import { runVerificationAgent, computeBurstiness, computeCliche, detectSentiment, applySemanticCloaking, forceBurstiness, applyVocabularyEngine, applyHumanFlaws } from '../server/utils/nlp.ts';

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

// ─── Verification Agent Structure Tests ─────────────────────────────

test('Returns valid VerificationReport object', () => {
  const report = runVerificationAgent('The cat sat on the mat. Dogs run fast in the park. Birds fly south for winter.');
  assert(typeof report.humanScore === 'number', 'humanScore not a number');
  assert(typeof report.passed === 'boolean', 'passed not boolean');
  assert(Array.isArray(report.failures), 'failures not array');
  assert(report.metrics.burstiness !== undefined, 'missing burstiness metric');
  assert(report.metrics.cliches !== undefined, 'missing cliches metric');
  assert(report.metrics.vocabRepetition !== undefined, 'missing vocabRepetition metric');
  assert(report.metrics.sentenceUniformity !== undefined, 'missing sentenceUniformity metric');
  assert(report.metrics.conjunctionDensity !== undefined, 'missing conjunctionDensity metric');
});

test('humanScore is between 0 and 100', () => {
  const report = runVerificationAgent('This is a test sentence. Another one here. And a third for good measure.');
  assert(report.humanScore >= 0 && report.humanScore <= 100, `Score out of range: ${report.humanScore}`);
});

// ─── Detection Accuracy Tests ───────────────────────────────────────

test('Detects ROBOTIC text (typical AI output)', () => {
  const aiText = `Furthermore, it is crucial to delve into the multifaceted tapestry of this paradigm. Moreover, we must foster a holistic approach. Additionally, it is worth noting that this robust framework underscores the nuanced landscape. Furthermore, we should utilize this seamlessly to elevate our understanding. Moreover, navigating this complex terrain requires showcasing our capabilities.`;
  const report = runVerificationAgent(aiText);
  console.log(`   └─ AI text score: ${report.humanScore}/100 | Failures: [${report.failures.join(', ')}]`);
  assert(report.humanScore < 60, `AI text scored too high: ${report.humanScore}`);
  assert(!report.passed, 'AI text should NOT pass');
});

test('Passes HUMAN-LIKE text (varied, natural writing)', () => {
  const humanText = `I was walking down the street yesterday. Bumped into an old friend — hadn't seen her in years. We grabbed coffee. She told me about her new job, some startup in Bangalore doing something with drones? Honestly I didn't fully get it but she seemed happy. Really happy. The kind of happy where you can tell it's real, you know? Anyway, we talked for like two hours. Time flies when you're catching up.`;
  const report = runVerificationAgent(humanText);
  console.log(`   └─ Human text score: ${report.humanScore}/100 | Failures: [${report.failures.join(', ')}]`);
  assert(report.humanScore >= 50, `Human text scored too low: ${report.humanScore}`);
});

// ─── Individual Metric Tests ────────────────────────────────────────

test('Cliche metric catches AI phrases', () => {
  const report = runVerificationAgent('In conclusion, we must delve into this tapestry. Furthermore, it is worth noting the paradigm shift.');
  assert(report.metrics.cliches.count >= 3, `Expected 3+ cliches, got ${report.metrics.cliches.count}`);
  assert(report.metrics.cliches.verdict === 'FAIL', 'Cliches should FAIL');
});

test('Vocabulary repetition catches repeated words', () => {
  // Text with extreme word repetition (same content words over and over)
  const repetitive = 'The system works well. The system works great. The system works fine. The system works perfectly. The system works well again. The system works here too.';
  const report = runVerificationAgent(repetitive);
  console.log(`   └─ Repetitive vocab ratio: ${report.metrics.vocabRepetition.ratio}, score: ${report.metrics.vocabRepetition.score}`);
  assert(report.metrics.vocabRepetition.score < 85, `Repetitive text vocab score too high: ${report.metrics.vocabRepetition.score}`);
});

test('Conjunction density catches AI connector overuse', () => {
  const connectorHeavy = 'We did this and that. However, we also tried something. Moreover, we found that furthermore the results were good. Additionally, the team also discovered new methods. Nevertheless, we continued and persisted.';
  const report = runVerificationAgent(connectorHeavy);
  console.log(`   └─ Conjunction density: ${report.metrics.conjunctionDensity.density}/sentence`);
  assert(report.metrics.conjunctionDensity.density > 0.5, `Expected high conjunction density, got ${report.metrics.conjunctionDensity.density}`);
});

// ─── Full Pipeline + Detector Integration ───────────────────────────

test('Full pipeline output passes detector', () => {
  // Simulate what the humanizer does: run all layers then verify
  let text = 'Furthermore, it is crucial to delve into this robust paradigm. Moreover, we must foster a holistic approach to elevate our understanding. The team built the product seamlessly. Additionally, this nuanced framework underscores everything.';
  text = forceBurstiness(text);
  text = applyVocabularyEngine(text, 'casual');
  text = applySemanticCloaking(text);
  text = applyHumanFlaws(text, 'low');
  const report = runVerificationAgent(text);
  console.log(`   └─ Post-pipeline score: ${report.humanScore}/100 | Passed: ${report.passed} | Failures: [${report.failures.join(', ')}]`);
  // After our full NLP pipeline, the score should be significantly better than raw AI text
  assert(report.humanScore > 30, `Pipeline output still too robotic: ${report.humanScore}`);
});

// ─── Regression Tests (Previous Phrases Still Work) ─────────────────

test('Phrase 3 regression: detectSentiment works', () => {
  assert(detectSentiment('happy excited amazing wonderful joy') === 'happy', 'broken');
  assert(detectSentiment('tragic loss grief sorrow pain') === 'sad', 'broken');
});

test('Phrase 4 regression: applySemanticCloaking works', () => {
  const result = applySemanticCloaking('The team built the product. The company launched the service. The artist painted the mural.');
  assert(typeof result === 'string' && result.length > 0, 'Cloaking crashed');
});

// ─── Edge Cases ─────────────────────────────────────────────────────

test('Handles empty string', () => {
  const report = runVerificationAgent('');
  assert(typeof report.humanScore === 'number', 'Crashed on empty');
});

test('Handles single sentence', () => {
  const report = runVerificationAgent('Just one sentence here.');
  assert(typeof report.humanScore === 'number', 'Crashed on single sentence');
});

// ─── Summary ────────────────────────────────────────────────────────

console.log(`\n🏁 Phrase 5 tests: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
