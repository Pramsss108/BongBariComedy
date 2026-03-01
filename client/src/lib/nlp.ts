// @ts-ignore - wink-nlp lacks official typescript declarations
import winkNLP from 'wink-nlp';
// @ts-ignore - The model might not have strict typescript definitions
import model from 'wink-eng-lite-web-model';

// Initialize winkNLP with the web model
const nlp = winkNLP(model);
const its = nlp.its;
const as = nlp.as;

/**
 * Basic Text Analysis
 * Extracts readability stats, sentences, tokens, and roots (stems).
 */
export function analyzeText(text: string) {
    const doc = nlp.readDoc(text);

    // Basic token extraction (words only)
    const words = doc.tokens().filter(t => t.out(its.type) === 'word').out();

    // Sentence boundaries
    const sentences = doc.sentences().out();

    // Readability statistics (e.g., Flesch Reading Ease)
    const readability = doc.out(its.readabilityStats);

    // Sentiment Analysis
    const sentiment = doc.out(its.sentiment);

    return {
        words,
        sentences,
        readability,
        sentiment,
        wordCount: words.length,
        sentenceCount: sentences.length,
    };
}

/**
 * Returns document sentences as string array for structural analysis
 */
export function getSentences(text: string): string[] {
    return nlp.readDoc(text).sentences().out();
}

/**
 * Normalizes text (Input Cleaning Layer 1)
 * Strips common AI artifacts, unnecessary markdown, and robotic intros.
 */
export function cleanInputText(text: string): { cleanedText: string; originalStats: any } {
    let cleaned = text.trim();

    // 1. Strip common AI conversational intros/outros
    const aiPhrases = [
        /^Here is the( rewritten)?( text)?:\s*/i,
        /^Sure,\s*/i,
        /^Certainly,\s*/i,
        /^I can help with that\.?\s*/i,
        /Let me know if you need anything else\.?$/i,
        /Hope this helps\.?$/i,
        /^As an AI language model,?\s*/i
    ];

    for (const regex of aiPhrases) {
        cleaned = cleaned.replace(regex, '');
    }

    // 2. Strip bold/italic markdown asterisks which AI loves to overuse
    cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '$1');
    cleaned = cleaned.replace(/\*([^*]+)\*/g, '$1');

    // 2b. Strip heading markers (## Title → Title) keeping the text
    cleaned = cleaned.replace(/^#{1,6}\s+/gm, '');

    // NOTE: Bullet/dash markers (- * •) are intentionally PRESERVED.
    // They represent user-intended structure and must survive into the server pipeline.
    // Only HTML-artifact formatting (**, ##) is stripped above.

    // 3. Normalize spacing
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
    cleaned = cleaned.replace(/[ \t]{2,}/g, ' ');

    // Get baseline structure before further processing
    const originalStats = analyzeText(cleaned);

    return {
        cleanedText: cleaned.trim(),
        originalStats
    };
}

// ============================================================================
// V10 SERVER-SIDE LOCKDOWN:
// 
// The advanced mathematical filters (Burstiness Engine, Vocabulary Swapping, 
// and Human Flaw Injection) have been permanently REMOVED from the client-side 
// browser payload.
//
// These algorithms are now securely executed entirely on the Node.js backend.
// This prevents sophisticated users and competitors from reverse-engineering
// the BongBari AI-evasion logic via Chrome DevTools.
// ============================================================================

export { nlp, its, as };
