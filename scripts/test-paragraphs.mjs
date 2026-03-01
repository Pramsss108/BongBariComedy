// Quick paragraph-preservation check
import { forceBurstiness, applySemanticCloaking, applyVocabularyEngine, applyHumanFlaws } from '../server/utils/nlp.ts';

const text = `Artificial intelligence has rapidly emerged as one of the most transformative technologies of the modern era, fundamentally reshaping the way individuals interact with information.\n\nOne of the most notable characteristics is the ability to process vast amounts of data with remarkable speed and accuracy. By leveraging sophisticated algorithms, these systems can identify patterns that might be difficult for humans to detect.\n\nFurthermore, the widespread adoption of artificial intelligence has sparked ongoing discussions regarding ethical considerations, transparency, and accountability.`;

let out = text;
out = forceBurstiness(out);
out = applyVocabularyEngine(out, 'casual');
out = applySemanticCloaking(out);
out = applyHumanFlaws(out, 'low');

const inParas = text.split(/\n\n/).length;
const outParas = out.split(/\n\n/).length;

console.log('Input paragraphs: ' + inParas);
console.log('Output paragraphs: ' + outParas);
console.log('PARAGRAPHS PRESERVED: ' + (outParas === inParas ? '✅ YES' : '❌ NO'));
console.log('\n--- FULL OUTPUT ---\n');
console.log(out);
console.log('\n--- PARAGRAPH SPLIT ---');
out.split(/\n\n/).forEach((p, i) => console.log(`[Para ${i+1}]: ${p.substring(0, 80)}...`));
