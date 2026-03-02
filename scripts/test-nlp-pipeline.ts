/**
 * Humanizer V12 NLP Pipeline Quality Test
 * Directly tests all 15 NLP layers on sample AI text, traces each layer,
 * and runs the verification agent.
 * 
 * Usage: npx tsx scripts/test-nlp-pipeline.ts
 */

import {
  forceBurstiness,
  applyVocabularyEngine,
  applySemanticCloaking,
  applyHumanFlaws,
  applyConjunctionPurge,
  applyIMFApproximation,
  applySentenceStarterDiversifier,
  applyParagraphRhythm,
  applyDeicticInjection,
  applyDenominalization,
  applyClauseReordering,
  applySemanticDrift,
  applyZipfNormalization,
  computeBurstiness,
  computeCliche,
  runVerificationAgent,
} from '../server/utils/nlp.js';

// ─── Sample AI-generated text (typical ChatGPT output) ───
const sampleAI = `The implementation of artificial intelligence in healthcare has been a transformative development in recent years. Furthermore, the utilization of machine learning algorithms has significantly improved diagnostic accuracy across various medical specialties. Additionally, these innovative technologies have streamlined the process of patient data analysis, enabling healthcare professionals to make more informed decisions.

It is worth noting that the integration of AI systems into clinical workflows has not been without challenges. Nevertheless, the robust frameworks developed by leading research institutions have demonstrated the potential to revolutionize patient care. Moreover, the seamless incorporation of predictive analytics has empowered physicians to identify potential health risks before they manifest as serious conditions.

In conclusion, the holistic approach to AI-driven healthcare represents a paradigm shift in how medical professionals deliver services. The ecosystem of digital health tools continues to evolve, and it is crucial that stakeholders collaborate to ensure these cutting-edge solutions are accessible to all. Furthermore, the journey toward fully integrated AI healthcare systems requires careful consideration of ethical implications and patient privacy concerns.`;

// ─── Academic-style sample ───
const sampleAcademic = `Climate change represents one of the most significant challenges facing contemporary society. The scientific consensus indicates that anthropogenic greenhouse gas emissions are the primary driver of observed warming trends. Research has consistently demonstrated that the implementation of carbon reduction strategies is essential for mitigating the worst effects of climate change. Furthermore, the development of renewable energy technologies has shown considerable promise in reducing dependency on fossil fuels, although the utilization of these technologies varies significantly across different regions and economic contexts.`;

// ─── Layer-by-layer tracing ───
function runPipelineWithTrace(text: string, vibe: 'casual' | 'academic' | 'genz' = 'casual', flawLevel: 'none' | 'low' | 'high' = 'low') {
  const layers = [
    { name: 'ConjunctionPurge', fn: (t: string) => applyConjunctionPurge(t) },
    { name: 'VocabularyEngine', fn: (t: string) => applyVocabularyEngine(t, vibe) },
    { name: 'IMFApproximation', fn: (t: string) => applyIMFApproximation(t) },
    { name: 'SemanticCloaking', fn: (t: string) => applySemanticCloaking(t) },
    { name: 'SentenceStarterDiversifier', fn: (t: string) => applySentenceStarterDiversifier(t, vibe) },
    { name: 'Burstiness', fn: (t: string) => forceBurstiness(t) },
    { name: 'HumanFlaws', fn: (t: string) => applyHumanFlaws(t, flawLevel) },
    { name: 'ParagraphRhythm', fn: (t: string) => applyParagraphRhythm(t) },
    { name: 'ZipfNormalization', fn: (t: string) => applyZipfNormalization(t) },
    { name: 'Denominalization', fn: (t: string) => applyDenominalization(t) },
    { name: 'ClauseReordering', fn: (t: string) => applyClauseReordering(t) },
    { name: 'DeicticInjection', fn: (t: string) => applyDeicticInjection(t, vibe) },
    { name: 'SemanticDrift', fn: (t: string) => applySemanticDrift(t, vibe) },
  ];

  let current = text;
  const snapshots: { name: string; changed: boolean; diff: string }[] = [];

  for (const layer of layers) {
    const before = current;
    current = layer.fn(current);
    const changed = before !== current;
    let diff = '';
    if (changed) {
      // Show a brief diff: first difference location
      for (let i = 0; i < Math.min(before.length, current.length); i++) {
        if (before[i] !== current[i]) {
          diff = `first change at char ${i}: "${before.substring(Math.max(0, i - 15), i + 25)}" → "${current.substring(Math.max(0, i - 15), i + 25)}"`;
          break;
        }
      }
      if (!diff && current.length !== before.length) {
        diff = `length changed: ${before.length} → ${current.length}`;
      }
    }
    snapshots.push({ name: layer.name, changed, diff });
  }

  return { output: current, snapshots };
}

console.log('\n' + '='.repeat(80));
console.log('  HUMANIZER V12 NLP PIPELINE QUALITY TEST');
console.log('='.repeat(80));

// ──────────────────── TEST 1: Full Pipeline on AI text (casual vibe) ────────────
console.log('\n\n📝 TEST 1: ChatGPT-style AI text → Casual vibe, low flaws');
console.log('─'.repeat(60));

const preReport1 = runVerificationAgent(sampleAI);
console.log(`\nBEFORE Pipeline: Score=${preReport1.humanScore}/100, Passed=${preReport1.passed}`);
for (const [key, val] of Object.entries(preReport1.metrics)) {
  console.log(`  ${key}: score=${(val as any).score}, verdict=${(val as any).verdict}`);
}

const { output: result1, snapshots: snap1 } = runPipelineWithTrace(sampleAI, 'casual', 'low');

console.log('\nLAYER TRACE:');
for (const s of snap1) {
  console.log(`  ${s.changed ? '✅ CHANGED' : '⬜ NO-OP '} ${s.name}${s.diff ? ` — ${s.diff}` : ''}`);
}

const postReport1 = runVerificationAgent(result1);
console.log(`\nAFTER Pipeline: Score=${postReport1.humanScore}/100, Passed=${postReport1.passed}`);
for (const [key, val] of Object.entries(postReport1.metrics)) {
  console.log(`  ${key}: score=${(val as any).score}, verdict=${(val as any).verdict}`);
}
if (postReport1.failures.length > 0) {
  console.log(`  FAILURES: ${postReport1.failures.join(', ')}`);
}
console.log(`\n  Improvement: ${preReport1.humanScore} → ${postReport1.humanScore} (${postReport1.humanScore - preReport1.humanScore >= 0 ? '+' : ''}${postReport1.humanScore - preReport1.humanScore})`);

console.log('\n\nFULL OUTPUT:');
console.log('─'.repeat(60));
console.log(result1);
console.log('─'.repeat(60));

// ──────────────────── Quality Checks ────────────
console.log('\n\n🔍 QUALITY CHECKS (Test 1):');
console.log('─'.repeat(60));

// Check 1: Content preservation
const keyTerms = ['artificial intelligence', 'healthcare', 'machine learning', 'diagnostic', 'patient'];
const preservedTerms = keyTerms.filter(term => result1.toLowerCase().includes(term));
const missingTerms = keyTerms.filter(term => !result1.toLowerCase().includes(term));
console.log(`  Content Preservation: ${preservedTerms.length}/${keyTerms.length} key terms retained`);
if (missingTerms.length > 0) console.log(`  ⚠️  Missing: ${missingTerms.join(', ')}`);

// Check 2: Word count
const inputWords = sampleAI.trim().split(/\s+/).length;
const outputWords = result1.trim().split(/\s+/).length;
const wordDiffPct = Math.round(Math.abs(outputWords - inputWords) / inputWords * 100);
console.log(`  Word Count: ${inputWords} → ${outputWords} (${wordDiffPct}% diff) ${wordDiffPct > 30 ? '⚠️ TOO DIFFERENT' : '✅'}`);

// Check 3: Bridge phrase injection count
const bridgePatterns = /( — and you'll notice| — worth thinking about| — and that's the part| — though context matters| — or that's how|honestly,|look,|here's the thing)/gi;
const bridgeCount = (result1.match(bridgePatterns) || []).length;
console.log(`  Bridge Phrases: ${bridgeCount} ${bridgeCount > 6 ? '⚠️ OVER-PROCESSED' : '✅'}`);

// Check 4: Remaining clichés
const { count: clicheCount } = computeCliche(result1);
console.log(`  AI Clichés Remaining: ${clicheCount} ${clicheCount > 2 ? '⚠️ STILL ROBOTIC' : '✅'}`);

// Check 5: Double spaces / broken punctuation
const doubleSpaces = (result1.match(/\s{2,}/g) || []).length;
const doublePunct = (result1.match(/[.!?]\s*[.!?]/g) || []).length;
console.log(`  Double Spaces: ${doubleSpaces}, Double Punctuation: ${doublePunct}`);

// Check 6: Sentence count and avg length
const sentences = result1.match(/[^.!?]+[.!?]+/g) || [];
const avgSentLen = sentences.length > 0 ? Math.round(sentences.reduce((a, s) => a + s.trim().split(/\s+/).length, 0) / sentences.length) : 0;
console.log(`  Sentences: ${sentences.length}, Avg Length: ${avgSentLen} words`);

// ──────────────────── TEST 2: Academic vibe ────────────
console.log('\n\n📝 TEST 2: AI text → Academic vibe, no flaws');
console.log('─'.repeat(60));

const { output: result2, snapshots: snap2 } = runPipelineWithTrace(sampleAcademic, 'academic', 'none');
const postReport2 = runVerificationAgent(result2);

console.log('LAYER TRACE:');
for (const s of snap2) {
  console.log(`  ${s.changed ? '✅ CHANGED' : '⬜ NO-OP '} ${s.name}`);
}

console.log(`\nScore: ${postReport2.humanScore}/100, Passed=${postReport2.passed}`);
if (postReport2.failures.length > 0) console.log(`  FAILURES: ${postReport2.failures.join(', ')}`);

console.log('\nOUTPUT:');
console.log('─'.repeat(60));
console.log(result2);
console.log('─'.repeat(60));

// ──────────────────── TEST 3: GenZ vibe ────────────
console.log('\n\n📝 TEST 3: AI text → GenZ vibe, high flaws');
console.log('─'.repeat(60));

const { output: result3, snapshots: snap3 } = runPipelineWithTrace(sampleAI, 'genz', 'high');
const postReport3 = runVerificationAgent(result3);

console.log('LAYER TRACE:');
for (const s of snap3) {
  console.log(`  ${s.changed ? '✅ CHANGED' : '⬜ NO-OP '} ${s.name}`);
}

console.log(`\nScore: ${postReport3.humanScore}/100, Passed=${postReport3.passed}`);
if (postReport3.failures.length > 0) console.log(`  FAILURES: ${postReport3.failures.join(', ')}`);

console.log('\nOUTPUT:');
console.log('─'.repeat(60));
console.log(result3);
console.log('─'.repeat(60));

// ──────────────────── SUMMARY ────────────
console.log('\n\n📊 SUMMARY:');
console.log('═'.repeat(60));
console.log(`  Test 1 (Casual):   ${preReport1.humanScore} → ${postReport1.humanScore} (${postReport1.passed ? 'PASS ✅' : 'FAIL ❌'})`);
console.log(`  Test 2 (Academic): ${runVerificationAgent(sampleAcademic).humanScore} → ${postReport2.humanScore} (${postReport2.passed ? 'PASS ✅' : 'FAIL ❌'})`);
console.log(`  Test 3 (GenZ):     ${preReport1.humanScore} → ${postReport3.humanScore} (${postReport3.passed ? 'PASS ✅' : 'FAIL ❌'})`);
console.log('═'.repeat(60));
console.log('\n');
