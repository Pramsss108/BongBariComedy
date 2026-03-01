import winkNLP from 'wink-nlp';
// @ts-ignore
import model from 'wink-eng-lite-web-model';

// Initialize winkNLP with the web model
const nlp = winkNLP(model);
const its = nlp.its;
const as = nlp.as;

/**
 * Structural Variation & Burstiness Engine (Layer 3)
 * Analyzes the LLM output sentences. If they are monotonously uniform,
 * it forces human-like 'burstiness' by splitting long sentences or joining short ones.
 */
export function forceBurstiness(text: string): string {
    const doc = nlp.readDoc(text);
    const sentences = doc.sentences().out();

    if (sentences.length < 3) return text; // Not enough text to vary structurally

    let output = [];
    let i = 0;

    while (i < sentences.length) {
        let s = sentences[i];
        const sdoc = nlp.readDoc(s);
        const words = sdoc.tokens().filter(t => t.out(its.type) === 'word').out();
        const len = words.length;

        // Condition 1: Long, winding AI sentence. Try to split into a punchy short sentence.
        if (len > 25 && s.includes(', and ')) {
            const splitPoint = s.lastIndexOf(', and ');
            if (splitPoint > 10) {
                let part1 = s.substring(0, splitPoint) + '.';
                let part2 = s.substring(splitPoint + 6);
                part2 = part2.charAt(0).toUpperCase() + part2.slice(1);
                output.push(part1);
                output.push(part2);
                i++;
                continue;
            }
        }

        // Condition 2: Monotonic short blocks. Join to create flow.
        if (i < sentences.length - 1) {
            const nextS = sentences[i + 1];
            const nextWords = nlp.readDoc(nextS).tokens().filter(t => t.out(its.type) === 'word').out();
            if (len < 10 && nextWords.length < 10 && !s.endsWith('?') && !nextS.endsWith('?')) {
                // Strip the trailing period from the first sentence and join with em-dash or conjunction
                let part1 = s.replace(/\.+$/, '');
                let part2 = nextS.charAt(0).toLowerCase() + nextS.slice(1);
                output.push(`${part1} — ${part2}`);
                i += 2;
                continue;
            }
        }

        // Fallback: append normally
        output.push(s);
        i++;
    }

    // Restore line breaks manually based on exact matching where possible, 
    // or simply join with spaces for paragraph continuity.
    return output.join(' ');
}

/**
 * Vocabulary Engine & Shannon Equitability (Layer 4)
 * Mathematically lowers perplexity predictability by hunting down the precise
 * high-probability "fingerprint" tokens that detectors rely on and replacing them.
 */
export function applyVocabularyEngine(text: string, vibe: 'academic' | 'casual' | 'genz' = 'casual'): string {
    // Common AI words that flag detectors instantly + their natural replacements
    const synonymMap: Record<string, string[]> = {
        'delve': ['look into', 'explore', 'investigate', 'examine'],
        'tapestry': ['fabric', 'mix', 'blend', 'collection'],
        'testament': ['proof', 'evidence', 'sign', 'clear sign'],
        'furthermore': ['also', 'in addition', 'plus', 'what\'s more'],
        'moreover': ['also', 'additionally', 'on top of that'],
        'crucial': ['key', 'important', 'vital', 'main'],
        'elevate': ['raise', 'boost', 'lift', 'improve'],
        'underscore': ['highlight', 'show', 'stress', 'point out'],
        'multifaceted': ['complex', 'detailed', 'layered'],
        'nuanced': ['subtle', 'detailed', 'complex'],
        'paradigm': ['example', 'model', 'pattern', 'standard'],
        'foster': ['encourage', 'promote', 'help grow'],
        'utilize': ['use', 'apply', 'employ'],
        'seamlessly': ['smoothly', 'easily', 'flawlessly'],
        'holistic': ['complete', 'overall', 'comprehensive'],
        'robust': ['strong', 'solid', 'tough', 'powerful']
    };

    let refinedText = text;

    // Simple token replacement algorithm
    Object.keys(synonymMap).forEach(cliche => {
        // Regex matches the word with word boundaries, taking case into account loosely
        const regex = new RegExp(`\\b${cliche}\\b`, 'gi');
        refinedText = refinedText.replace(regex, (match) => {
            // Pick a random synonym
            const syns = synonymMap[cliche];
            const syn = syns[Math.floor(Math.random() * syns.length)];

            // Attempt to preserve basic capitalization
            if (match.charAt(0) === match.charAt(0).toUpperCase()) {
                return syn.charAt(0).toUpperCase() + syn.slice(1);
            }
            return syn;
        });
    });

    // Equitability adjustment: AI uses "and" connecting clauses far more often than humans
    // We selectively swap non-leading " and " with a semicolon or comma splice occasionally, 
    // depending on the vibe to shift the token distribution curve.
    if (vibe === 'academic') {
        let andCount = 0;
        refinedText = refinedText.replace(/, and /g, (match) => {
            andCount++;
            return (andCount % 3 === 0) ? '; ' : match;
        });
    } else if (vibe === 'genz') {
        let andCount = 0;
        refinedText = refinedText.replace(/ and /g, (match) => {
            andCount++;
            return (andCount % 4 === 0) ? ' + ' : match;
        });
    }

    return refinedText;
}

/**
 * Selective Token Masking (STM) & Post-Processing (Layer 5)
 * Mathematically injects calculated human flaws to disrupt clean AI grammatical vectors.
 */
export function applyHumanFlaws(text: string, flawLevel: 'none' | 'low' | 'high' = 'low'): string {
    if (flawLevel === 'none') return text;

    let flawed = text;

    // LOW FLAW LEVEL: Very mild colloquialisms
    // Occasional lowercase 'i' instead of 'I', missing trailing commas
    if (flawLevel === 'low' || flawLevel === 'high') {
        // 15% chance to lowercase an isolated 'I'
        flawed = flawed.replace(/\bI\b/g, (match) => Math.random() < 0.15 ? 'i' : match);

        // Contractions normally expanded by AI: "do not" -> "don't" (50% chance)
        flawed = flawed.replace(/\bdo not\b/gi, (match) => Math.random() < 0.5 ? 'don\'t' : match);
        flawed = flawed.replace(/\bcannot\b/gi, (match) => Math.random() < 0.5 ? 'can\'t' : match);
    }

    // HIGH FLAW LEVEL: Aggressive structural typos
    // Missing capitalization at start of some sentences, completely dropped commas
    if (flawLevel === 'high') {
        // 30% chance to lowercase the first letter of a sentence
        flawed = flawed.replace(/(?:^|[.!?]\s+)([A-Z])/g, (match, letter) => {
            return Math.random() < 0.3 ? match.toLowerCase() : match;
        });

        // 25% chance to drop a comma entirely
        flawed = flawed.replace(/,/g, (match) => Math.random() < 0.25 ? '' : match);

        // 10% chance to swap 'their'/'there' or 'your'/'you're' (Classic human mistakes)
        flawed = flawed.replace(/\btheir\b/gi, (m) => Math.random() < 0.1 ? 'there' : m);
        flawed = flawed.replace(/\byour\b/gi, (m) => Math.random() < 0.1 ? 'you\'re' : m);
    }

    return flawed;
}

// ─── Verification Metrics (Layer 6 Support) ────────────────────────────────────────────────

export const AI_CLICHES = [
    "in conclusion", "delve into", "it's worth noting", "it is worth noting",
    "a tapestry of", "moreover", "furthermore", "in the realm of",
    "it is important to note", "navigating", "showcasing", "at its core",
    "underpins", "underscores", "multifaceted", "nuanced", "in today's world",
    "revolutionize", "game-changer", "paradigm shift", "foster", "facilitate",
    "utilize", "seamlessly", "cutting-edge", "state-of-the-art", "holistic",
];

export function computeBurstiness(text: string): number {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    const lengths = sentences.map(s => s.trim().split(/\s+/).length).filter(l => l > 1);
    if (lengths.length < 2) return 50;
    const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const variance = lengths.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / lengths.length;
    let score = Math.min(100, Math.round((Math.sqrt(variance) / mean) * 220));
    const paragraphs = text.split('\n\n').filter(p => p.trim().length > 0);
    if (paragraphs.length >= 2) score += paragraphs.length * 15;
    return Math.min(100, score);
}

export function computeCliche(text: string): { score: number; count: number } {
    const lower = text.toLowerCase();
    const count = AI_CLICHES.filter(c => lower.includes(c)).length;
    return { score: Math.max(0, 100 - count * 12), count };
}
