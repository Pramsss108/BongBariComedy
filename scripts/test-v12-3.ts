import { forceBurstiness, applyVocabularyEngine, applyConjunctionPurge, applySemanticCloaking, applyIMFApproximation, applySentenceStarterDiversifier, applyHumanFlaws, applyParagraphRhythm, applyZipfNormalization, applyDenominalization, applyClauseReordering, applyDeicticInjection, applySemanticDrift, runVerificationAgent } from '../server/utils/nlp';

const input = `Artificial intelligence has become an essential part of modern technology, allowing systems to analyze data, recognize patterns, and automate decision-making processes. These systems are designed to improve efficiency and reduce the need for manual effort in repetitive tasks. However, their effectiveness depends heavily on the quality of data they are trained on, which means biases can still exist and influence results. While AI continues to evolve and integrate into various industries, it is important to consider ethical concerns and ensure that its development aligns with broader societal values.`;

console.log('=== INPUT ===');
const inWords = input.trim().split(/\s+/).length;
console.log('Word count:', inWords);

// Simulate a CLEAN LLM rewrite (what Groq should return with the new tighter prompt)
let text = `AI has become a key part of modern tech, letting systems analyze data, spot patterns, and automate decisions. These systems are built to boost efficiency and cut down manual effort in repetitive tasks. That said, how well they work depends a lot on the quality of data they're trained on, meaning biases can still show up and skew results. As AI keeps evolving and spreading across industries, it's important to think about ethical concerns and make sure its development lines up with broader societal values.`;

console.log('\n=== SIMULATED LLM OUTPUT (before NLP) ===');
console.log('Word count:', text.trim().split(/\s+/).length);

// Run full V12.3 pipeline
console.log('\n=== RUNNING 15-LAYER V12.3 PIPELINE ===');

text = applyConjunctionPurge(text);
console.log('L2  ConjunctionPurge:', text.trim().split(/\s+/).length, 'words');

text = applyVocabularyEngine(text);
console.log('L3  VocabEngine:', text.trim().split(/\s+/).length, 'words');

text = applyIMFApproximation(text);
console.log('L4  IMF:', text.trim().split(/\s+/).length, 'words');

text = applySemanticCloaking(text);
console.log('L4b SemanticCloaking:', text.trim().split(/\s+/).length, 'words');

text = applySentenceStarterDiversifier(text);
console.log('L6  StarterDiv:', text.trim().split(/\s+/).length, 'words');

text = forceBurstiness(text);
console.log('L7  Burstiness:', text.trim().split(/\s+/).length, 'words');

text = applyHumanFlaws(text, 'low');
console.log('L8  HumanFlaws:', text.trim().split(/\s+/).length, 'words');

text = applyParagraphRhythm(text);
console.log('L9  ParagraphRhythm:', text.trim().split(/\s+/).length, 'words');

text = applyZipfNormalization(text);
console.log('L10 Zipf:', text.trim().split(/\s+/).length, 'words');

text = applyDenominalization(text);
console.log('L11 Denominalization:', text.trim().split(/\s+/).length, 'words');

text = applyClauseReordering(text);
console.log('L12 ClauseReorder:', text.trim().split(/\s+/).length, 'words');

text = applyDeicticInjection(text, 'casual');
console.log('L13 Deictic:', text.trim().split(/\s+/).length, 'words');

text = applySemanticDrift(text, 'casual');
console.log('L14 SemanticDrift:', text.trim().split(/\s+/).length, 'words');

const report = runVerificationAgent(text);
console.log('L15 Verification:', report.humanScore, '/100 | Passed:', report.passed);
console.log('Failures:', report.failures.length ? report.failures.join(', ') : 'NONE');

console.log('\n=== FINAL OUTPUT ===');
const outWords = text.trim().split(/\s+/).length;
const drift = Math.round(((outWords - inWords) / inWords) * 100);
console.log(`Word count: ${outWords} (input: ${inWords} | drift: ${drift > 0 ? '+' : ''}${drift}%)`);
console.log('\n' + text);

console.log('\n=== QUALITY SCORECARD ===');
console.log(`  Burstiness:      ${report.metrics.burstiness.score}/100 (${report.metrics.burstiness.verdict})`);
console.log(`  Cliches:         ${report.metrics.cliches.count} found, score ${report.metrics.cliches.score}/100 (${report.metrics.cliches.verdict})`);
console.log(`  Vocab Variety:   ratio ${report.metrics.vocabRepetition.ratio}, score ${report.metrics.vocabRepetition.score}/100 (${report.metrics.vocabRepetition.verdict})`);
console.log(`  Sent Uniformity: CV ${report.metrics.sentenceUniformity.coefficientOfVariation}, score ${report.metrics.sentenceUniformity.score}/100 (${report.metrics.sentenceUniformity.verdict})`);
console.log(`  Conj Density:    ${report.metrics.conjunctionDensity.density}/sent, score ${report.metrics.conjunctionDensity.score}/100 (${report.metrics.conjunctionDensity.verdict})`);
console.log(`  Pronoun Rate:    ${report.metrics.pronounRate.rate}/100w, score ${report.metrics.pronounRate.score}/100 (${report.metrics.pronounRate.verdict})`);
console.log(`  Nominalization:  ${report.metrics.nominalizationRate.rate}/100w, score ${report.metrics.nominalizationRate.score}/100 (${report.metrics.nominalizationRate.verdict})`);
console.log(`\n  OVERALL HUMAN SCORE: ${report.humanScore}/100`);
