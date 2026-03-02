import winkNLP from 'wink-nlp';
// @ts-ignore
import model from 'wink-eng-lite-web-model';

// Initialize winkNLP with the web model
const nlp = winkNLP(model);
const its = nlp.its;
const as = nlp.as;

// ─── Sentiment Detection (Layer 4a — Contextual Memory) ──────────────────────

export type Sentiment = 'happy' | 'sad' | 'professional' | 'neutral';

// Lexicon-based sentiment detection using wink-nlp token analysis.
// Scans for emotionally charged words and returns the dominant mood.
const SENTIMENT_LEXICON: Record<Sentiment, string[]> = {
  happy: [
    'happy', 'joy', 'love', 'amazing', 'wonderful', 'fantastic', 'great',
    'excited', 'awesome', 'brilliant', 'celebrate', 'cheerful', 'delight',
    'enjoy', 'fun', 'glad', 'grateful', 'laugh', 'optimistic', 'pleased',
    'smile', 'success', 'thrill', 'triumph', 'beautiful', 'blessed',
    'enthusiastic', 'paradise', 'incredible', 'superb'
  ],
  sad: [
    'sad', 'unfortunately', 'tragic', 'loss', 'grief', 'pain', 'sorrow',
    'devastating', 'heartbreaking', 'struggle', 'suffer', 'mourn', 'regret',
    'disappoint', 'lonely', 'miserable', 'desperate', 'hopeless', 'fear',
    'anxiety', 'worried', 'terrible', 'awful', 'hurt', 'cry', 'depressed',
    'failed', 'disaster', 'gloomy', 'anguish'
  ],
  professional: [
    'revenue', 'strategy', 'stakeholder', 'implementation', 'framework',
    'compliance', 'deliverable', 'optimize', 'enterprise', 'benchmark',
    'analytics', 'infrastructure', 'scalable', 'leverage', 'synergy',
    'quarterly', 'fiscal', 'governance', 'pipeline', 'roi', 'kpi',
    'acquisition', 'portfolio', 'operational', 'executive', 'protocol',
    'methodology', 'procurement', 'audit', 'regulation'
  ],
  neutral: [] // fallback — no specific triggers
};

export function detectSentiment(text: string): Sentiment {
  const doc = nlp.readDoc(text.toLowerCase());
  const words = doc.tokens().filter(t => t.out(its.type) === 'word').out() as string[];

  const scores: Record<Sentiment, number> = { happy: 0, sad: 0, professional: 0, neutral: 0 };

  for (const word of words) {
    for (const mood of ['happy', 'sad', 'professional'] as Sentiment[]) {
      if (SENTIMENT_LEXICON[mood].includes(word)) {
        scores[mood]++;
      }
    }
  }

  // Require at least 2 hits to claim a sentiment; otherwise neutral
  const best = (Object.keys(scores) as Sentiment[])
    .filter(k => k !== 'neutral')
    .sort((a, b) => scores[b] - scores[a])[0];

  return scores[best] >= 2 ? best : 'neutral';
}

/**
 * Structural Variation & Burstiness Engine (Layer 3)
 * Analyzes the LLM output sentences. If they are monotonously uniform,
 * it forces human-like 'burstiness' by splitting long sentences or joining short ones.
 */
export function forceBurstiness(text: string): string {
    // ── Paragraph-aware: preserve \n\n breaks through the engine ──
    const paragraphs = text.split(/\n\n+/);
    if (paragraphs.length > 1) {
        return paragraphs.map(p => forceBurstiness(p)).join('\n\n');
    }

    // ── Skip bullet/numbered list paragraphs — don't break list structure ──
    const lines = text.split('\n').filter(l => l.trim());
    const bulletOrNumberedLines = lines.filter(l => /^[\s]*[-*•]\s/.test(l) || /^[\s]*\d+[\.\)]\s/.test(l)).length;
    if (bulletOrNumberedLines / Math.max(lines.length, 1) > 0.4) return text;

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
        // V12.1: Lowered threshold from 25 to 18 words — AI sentences are typically 15-25 words
        if (len > 18 && s.includes(', and ')) {
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

        // V12.1: Also split at ", which ", ", so ", ", but " for 20+ word sentences
        if (len > 20) {
            const splitPatterns = [', which ', ', so ', ', but '];
            for (const pat of splitPatterns) {
                const splitIdx = s.lastIndexOf(pat);
                if (splitIdx > 10 && splitIdx < s.length - 15) {
                    let part1 = s.substring(0, splitIdx) + '.';
                    let part2 = s.substring(splitIdx + pat.length);
                    part2 = part2.charAt(0).toUpperCase() + part2.slice(1);
                    output.push(part1);
                    output.push(part2);
                    i++;
                    break;
                }
            }
            if (output.length > 0 && output[output.length - 1] !== s) {
                // Already split above
                continue;
            }
        }

        // Condition 2: Monotonic short blocks. Join to create flow.
        if (i < sentences.length - 1) {
            const nextS = sentences[i + 1];
            const nextWords = nlp.readDoc(nextS).tokens().filter(t => t.out(its.type) === 'word').out();
            if (len < 10 && nextWords.length < 10 && !s.endsWith('?') && !nextS.endsWith('?')) {
                // Strip the trailing period from the first sentence and join with em-dash or conjunction
                const part1: string = s.replace(/\.+$/, '');
                const part2: string = nextS.charAt(0).toLowerCase() + nextS.slice(1);
                output.push(`${part1} — ${part2}`);
                i += 2;
                continue;
            }
        }

        // Fallback: append normally
        output.push(s);
        i++;
    }

    return output.join(' ');
}

/**
 * Vocabulary Engine & Shannon Equitability (Layer 4)
 * Mathematically lowers perplexity predictability by hunting down the precise
 * high-probability "fingerprint" tokens that detectors rely on and replacing them.
 */
export function applyVocabularyEngine(text: string, vibe: 'academic' | 'casual' | 'genz' = 'casual', sentimentOverride?: Sentiment): string {
    // V10 Phase 3: Detect the emotional context of the text
    const sentiment = sentimentOverride ?? detectSentiment(text);

    // Base synonym map — universal AI-flagged words
    const baseSynonyms: Record<string, string[]> = {
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
        'seamlessly': ['smoothly', 'easily', 'without friction'],
        'holistic': ['complete', 'overall', 'comprehensive'],
        'robust': ['strong', 'solid', 'tough', 'powerful'],
        'leverage': ['use', 'harness', 'apply', 'tap into'],
        'leveraging': ['using', 'harnessing', 'applying'],
        'transformative': ['meaningful', 'significant', 'real', 'genuine'],
        'in order to': ['to'],
        "in today's world": ['today', 'these days', 'right now', 'at this point'],
        'component': ['part', 'piece', 'element', 'aspect'],
        'integrate': ['combine', 'bring together', 'connect', 'merge'],
        'integration': ['combination', 'connection', 'merging', 'blending'],
        'innovative': ['new', 'fresh', 'creative', 'original'],
        'innovation': ['new thinking', 'fresh ideas', 'progress'],
        'empower': ['help', 'enable', 'allow', 'give a boost to'],
        'empowering': ['helping', 'enabling', 'allowing'],
        // V12.1 FIX: Added missing high-priority AI clichés that slipped through
        'cutting-edge': ['modern', 'current', 'advanced', 'latest'],
        'state-of-the-art': ['modern', 'advanced', 'top-tier', 'latest'],
        'ecosystem': ['landscape', 'environment', 'space', 'world'],
        'journey': ['path', 'process', 'progression', 'experience'],
        'seamless': ['smooth', 'easy', 'clean', 'effortless'],
        'revolutionize': ['reshape', 'transform', 'overhaul', 'rethink'],
        'revolutionized': ['reshaped', 'transformed', 'overhauled'],
        'game-changer': ['turning point', 'breakthrough', 'shift'],
        'impactful': ['meaningful', 'significant', 'real', 'substantial'],
        'paradigm shift': ['major shift', 'fundamental change', 'new direction', 'standard shift'],
        'streamline': ['simplify', 'speed up', 'clean up', 'tighten'],
        'streamlined': ['simplified', 'sped up', 'cleaned up', 'tightened'],
        'scalable': ['flexible', 'adaptable', 'extensible'],
        'actionable': ['practical', 'concrete', 'doable', 'hands-on'],
        'synergy': ['teamwork', 'cooperation', 'collaboration'],
    };

    // V10 Phase 3: Sentiment-aware synonym overlays
    // These OVERRIDE base synonyms when a mood is detected, making swaps emotionally coherent.
    const sentimentOverlays: Record<Sentiment, Record<string, string[]>> = {
        happy: {
            'crucial': ['exciting', 'wonderful', 'fantastic'],
            'elevate': ['brighten', 'uplift', 'supercharge'],
            'robust': ['thriving', 'vibrant', 'energetic'],
            'foster': ['spark', 'inspire', 'fuel'],
            'underscore': ['celebrate', 'spotlight', 'champion']
        },
        sad: {
            'crucial': ['painful', 'hard', 'difficult'],
            'elevate': ['ease', 'soothe', 'mend'],
            'robust': ['resilient', 'enduring', 'steadfast'],
            'foster': ['support', 'shelter', 'comfort'],
            'underscore': ['reflect on', 'acknowledge', 'confront']
        },
        professional: {
            'crucial': ['critical', 'essential', 'pivotal'],
            'elevate': ['advance', 'enhance', 'strengthen'],
            'robust': ['scalable', 'reliable', 'enterprise-grade'],
            'foster': ['cultivate', 'develop', 'accelerate'],
            'underscore': ['emphasize', 'reinforce', 'substantiate']
        },
        neutral: {} // use base synonyms as-is
    };

    // Merge: sentiment overlays take priority over base
    const synonymMap = { ...baseSynonyms, ...sentimentOverlays[sentiment] };

    let refinedText = text;

    // Token replacement algorithm with sentiment-aware swaps
    Object.keys(synonymMap).forEach(cliche => {
        const regex = new RegExp(`\\b${cliche}\\b`, 'gi');
        refinedText = refinedText.replace(regex, (match) => {
            const syns = synonymMap[cliche];
            const syn = syns[Math.floor(Math.random() * syns.length)];

            // Preserve basic capitalization
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

    // V12.1 FIX: Article agreement — "a" → "an" before vowel sounds after synonym replacement
    // e.g., "a paradigm" → VocabEngine → "a example" → this fixer → "an example"
    refinedText = refinedText.replace(/\b(a) ([aeiou])/gi, (match, article, vowel) => {
        // Preserve capitalization of the article
        return (article === 'A' ? 'An' : 'an') + ' ' + vowel;
    });

    return refinedText;
}

// ─── Semantic Cloaking Engine (Layer 4b — Voice Reversal) ──────────────────────────────────

// Irregular past participles that differ from simple past
const IRREGULAR_PP: Record<string, string> = {
    'build': 'built', 'write': 'written', 'take': 'taken', 'give': 'given',
    'make': 'made', 'break': 'broken', 'choose': 'chosen', 'drive': 'driven',
    'eat': 'eaten', 'fall': 'fallen', 'get': 'gotten', 'grow': 'grown',
    'hide': 'hidden', 'know': 'known', 'ride': 'ridden', 'rise': 'risen',
    'see': 'seen', 'shake': 'shaken', 'show': 'shown', 'speak': 'spoken',
    'steal': 'stolen', 'swim': 'swum', 'throw': 'thrown', 'wear': 'worn',
    'win': 'won', 'begin': 'begun', 'do': 'done', 'draw': 'drawn',
    'fly': 'flown', 'forget': 'forgotten', 'freeze': 'frozen', 'go': 'gone',
    'hold': 'held', 'keep': 'kept', 'lead': 'led', 'leave': 'left',
    'lose': 'lost', 'pay': 'paid', 'run': 'run', 'say': 'said',
    'sell': 'sold', 'send': 'sent', 'sing': 'sung', 'sit': 'sat',
    'sleep': 'slept', 'spend': 'spent', 'stand': 'stood', 'teach': 'taught',
    'tell': 'told', 'think': 'thought', 'understand': 'understood',
    'bring': 'brought', 'buy': 'bought', 'catch': 'caught', 'feel': 'felt',
    'find': 'found', 'have': 'had', 'hear': 'heard', 'lend': 'lent',
    'meet': 'met', 'put': 'put', 'read': 'read', 'set': 'set',
    'cut': 'cut', 'hit': 'hit', 'let': 'let', 'shut': 'shut'
};

// Reverse lookup: past participle → base form
const PP_TO_BASE: Record<string, string> = {};
for (const [base, pp] of Object.entries(IRREGULAR_PP)) {
    PP_TO_BASE[pp] = base;
}

/**
 * Semantic Cloaking Engine (Layer 4b)
 * Selectively reverses Active↔Passive voice on ~30% of eligible sentences.
 * This destroys the meaning-vector fingerprints AI detectors rely on
 * without changing the actual meaning of the text.
 */
export function applySemanticCloaking(text: string): string {
    // ── Paragraph-aware: preserve \n\n breaks through the cloaking engine ──
    const paragraphs = text.split(/\n\n+/);
    if (paragraphs.length > 1) {
        return paragraphs.map(p => applySemanticCloaking(p)).join('\n\n');
    }

    const doc = nlp.readDoc(text);
    const sentences = doc.sentences().out() as string[];

    if (sentences.length < 2) return text; // Too short to cloak safely

    const cloaked = sentences.map((sentence, idx) => {
        // Only cloak ~30% of sentences to maintain natural variation
        if (Math.random() > 0.30) return sentence;

        const sDoc = nlp.readDoc(sentence);
        const tokens: { text: string; pos: string; lemma: string }[] = [];
        sDoc.tokens().each((t: any) => {
            tokens.push({ text: t.out(), pos: t.out(its.pos), lemma: t.out(its.lemma) });
        });

        // Skip very short sentences (< 4 real words) — too risky to flip
        const wordTokens = tokens.filter(t => t.pos !== 'PUNCT' && t.pos !== 'SPACE');
        if (wordTokens.length < 4) return sentence;

        // Detect PASSIVE: [NOUN] + was/were + [VERB] + by + [NOUN]
        const auxIdx = tokens.findIndex(t => t.pos === 'AUX' && (t.lemma === 'be'));
        const byIdx = tokens.findIndex(t => t.pos === 'ADP' && t.text.toLowerCase() === 'by');
        const verbIdx = tokens.findIndex((t, i) => i > auxIdx && t.pos === 'VERB');

        if (auxIdx > 0 && verbIdx > auxIdx && byIdx > verbIdx) {
            // PASSIVE → ACTIVE conversion
            // Extract subject (before AUX), verb, agent (after "by")
            const subjectTokens = tokens.slice(0, auxIdx).filter(t => t.pos !== 'PUNCT');
            const agentTokens = tokens.slice(byIdx + 1).filter(t => t.pos !== 'PUNCT');

            if (subjectTokens.length > 0 && agentTokens.length > 0) {
                const verb = tokens[verbIdx];
                const agentText = agentTokens.map(t => t.text).join(' ').replace(/\.$/, '');
                const subjectText = subjectTokens.map(t => t.text).join(' ');

                // Reconstruct as active: Agent + verb (past) + subject
                // Use lemma to get base, then add past tense -ed or irregular
                const pastVerb = verb.text; // already in past participle form, reuse
                const activeAgent = agentText.charAt(0).toUpperCase() + agentText.slice(1);
                return `${activeAgent} ${pastVerb} ${subjectText.toLowerCase()}.`;
            }
        }

        // V12.1: Active→Passive conversion DISABLED
        // The POS-based SVO detection without a real dependency parser is too unreliable.
        // It produced garbled output like "indicatesed", "continuesed", reversed meanings,
        // and grabbed subordinate clauses as objects.
        // Only Passive→Active (above) is safe because it has clear structural markers (was/were + V + by).
        // Active→Passive may be re-enabled in V13 with a proper dependency parser.

        // No pattern matched — return original
        return sentence;
    });

    // Fix wink-nlp tokenization artifacts: "it 's" → "it's", "don 't" → "don't"
    const joined = cloaked.join(' ');
    return joined.replace(/(\w) '(s|t|d|ll|re|ve|m)\b/gi, "$1'$2");
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

// ─── V11 NEW FUNCTIONS ──────────────────────────────────────────────────────────────────────

/**
 * Conjunction Purge Engine (Layer 2 — V11 NEW)
 * Strips AI discourse markers from sentence starts.
 * Research: Discourse marker swapping is #9 in top 10 evasion techniques.
 * Target: GPTZero + Turnitin conjunction density metric.
 */
export function applyConjunctionPurge(text: string): string {
    const paragraphs = text.split(/\n\n+/);
    if (paragraphs.length > 1) {
        return paragraphs.map(p => applyConjunctionPurge(p)).join('\n\n');
    }

    const doc = nlp.readDoc(text);
    const sentences = doc.sentences().out() as string[];

    const purged = sentences.map(sentence => {
        let s = sentence.trim();

        // Strip AI discourse markers from sentence starts
        // Pattern: "Marker, rest of sentence" → "Rest of sentence"
        const starterPattern = /^(Furthermore|Moreover|Additionally|In addition|In conclusion|To conclude|To summarize|In summary|Consequently|Nevertheless|Nonetheless|As a result|Therefore|Hence|Thus|In contrast|On the other hand|On the contrary|That being said|With that said|Last but not least|First and foremost|Needless to say),?\s+/i;

        const starterMatch = s.match(starterPattern);
        if (starterMatch) {
            const rest = s.slice(starterMatch[0].length).trim();
            if (rest.length > 5) {
                s = rest.charAt(0).toUpperCase() + rest.slice(1);
            }
        }

        // Strip inline signposting phrases at the start of sentences
        const inlinePattern = /^(It is worth noting that|It should be noted that|It is important to note that|It is essential to note that|It is clear that|It goes without saying that)\s*/i;
        const inlineMatch = s.match(inlinePattern);
        if (inlineMatch) {
            const rest = s.slice(inlineMatch[0].length).trim();
            if (rest.length > 5) {
                s = rest.charAt(0).toUpperCase() + rest.slice(1);
            }
        }

        return s;
    });

    // Fix wink-nlp tokenization artifacts preserved from join
    const joined = purged.join(' ');
    return joined.replace(/(\w) '(s|t|d|ll|re|ve|m)\b/gi, "$1'$2");
}

// ─── Predictable Token Map for IMF Approximation ─────────────────────────────
// Research: IMF = Iterative Mask Filling. These are the statistically most
// predictable tokens in AI text. Replacing 40% with higher-entropy alternatives
// directly raises perplexity scores into the human range (20–50).
const PREDICTABLE_TOKENS: Record<string, string[]> = {
    'said':      ['noted', 'pointed out', 'remarked', 'observed', 'mentioned'],
    'shows':     ['reveals', 'highlights', 'exposes', 'demonstrates', 'points to'],
    'show':      ['reveal', 'highlight', 'expose', 'demonstrate', 'point to'],
    'helps':     ['enables', 'supports', 'aids', 'makes it easier', 'allows'],
    'help':      ['enable', 'support', 'aid', 'make it easier', 'allow'],
    'important': ['central', 'key', 'significant', 'vital', 'noteworthy'],
    'different': ['distinct', 'varied', 'contrasting', 'separate', 'divergent'],
    'makes':     ['creates', 'produces', 'generates', 'results in', 'leads to'],
    'make':      ['create', 'produce', 'generate', 'result in', 'lead to'],
    'getting':   ['securing', 'obtaining', 'achieving', 'landing', 'gaining'],
    'get':       ['secure', 'obtain', 'achieve', 'gain', 'land'],
    'very':      ['quite', 'remarkably', 'notably', 'particularly', 'genuinely'],
    'real':      ['actual', 'genuine', 'authentic', 'concrete', 'tangible'],
    'big':       ['major', 'substantial', 'considerable', 'significant', 'large-scale'],
    'good':      ['solid', 'strong', 'effective', 'worthwhile', 'decent'],
    'need':      ['require', 'call for', 'demand', 'warrant', 'necessitate'],
    'needs':     ['requires', 'calls for', 'demands', 'warrants'],
    'ways':      ['methods', 'approaches', 'strategies', 'paths', 'avenues'],
    'things':    ['aspects', 'elements', 'factors', 'points', 'items'],
    'area':      ['domain', 'field', 'sphere', 'sector', 'territory'],
    'part':      ['component', 'element', 'aspect', 'piece', 'segment'],
    'often':     ['frequently', 'regularly', 'commonly', 'typically', 'routinely'],
    'allows':    ['lets', 'enables', 'makes it possible to', 'opens the door to'],
    'example':   ['instance', 'case', 'illustration', 'scenario'],
};

/**
 * IMF Approximation — Perplexity Spiking Engine (Layer 4 — V11 NEW)
 * Approximates Iterative Mask Filling: replaces 40% of most-predictable tokens
 * with higher-entropy alternatives, directly raising text perplexity.
 * Research: IMF is ranked #6 in top 10 AI detector evasion techniques.
 */
export function applyIMFApproximation(text: string): string {
    let output = text;

    // Replace 40% of each target token's occurrences (not 100% — preserves natural distribution)
    for (const [token, alts] of Object.entries(PREDICTABLE_TOKENS)) {
        const regex = new RegExp(`\\b${token}\\b`, 'g');
        output = output.replace(regex, (match) => {
            // 40% replacement rate — mirrors what real IMF does statistically
            if (Math.random() > 0.40) return match;
            const alt = alts[Math.floor(Math.random() * alts.length)];
            // Preserve capitalization
            if (match.charAt(0) === match.charAt(0).toUpperCase() && match.charAt(0).toLowerCase() !== match.charAt(0).toUpperCase()) {
                return alt.charAt(0).toUpperCase() + alt.slice(1);
            }
            return alt;
        });
    }

    return output;
}

/**
 * Sentence Starter Diversifier (Layer 6 — V11 NEW)
 * Rewrites monotonous AI sentence starters (The/It/This/There).
 * Research: AI relies heavily on repetitive starters. Humans begin sentences
 * with conjunctions (And, But), prepositional phrases, or conversational openers.
 */
export function applySentenceStarterDiversifier(text: string, vibe: 'academic' | 'casual' | 'genz' = 'casual'): string {
    const paragraphs = text.split(/\n\n+/);
    if (paragraphs.length > 1) {
        return paragraphs.map(p => applySentenceStarterDiversifier(p, vibe)).join('\n\n');
    }

    // Skip bullet/numbered list paragraphs — don't touch list item structure
    const bulletRatio = (text.match(/^[\s]*[-*•\d][\.\)]?\s/gm) || []).length;
    const lineCount = text.split('\n').filter(l => l.trim()).length;
    if (bulletRatio / Math.max(lineCount, 1) > 0.4) return text;

    const doc = nlp.readDoc(text);
    const sentences = doc.sentences().out() as string[];
    if (sentences.length < 2) return text;

    const diversified = sentences.map((sentence, idx) => {
        // Skip first sentence of each paragraph + only change ~40% of candidates (V12.1: raised from 25%)
        if (idx === 0 || Math.random() > 0.40) return sentence;

        const s = sentence.trim();

        // V12.1 FIX: Expanded Pattern 1 to match multi-word noun phrases
        // Old: ^The \w+ (is|are|...) — only matched "The X is/are" (one word after The)
        // New: also matches "The X of Y has/have/is/..." and "The X Y Z verb..." forms
        if (/^The (\w+ ){1,8}(is|are|was|were|has|have|can|will|shows?|makes?|provides?|allows?|helps?|continues?|represents?|requires?|developed|improved|demonstrated|enabled)\b/i.test(s)) {
            // V12.1 FIX: Vibe-aware openers — academic gets formal, casual/genz gets conversational
            const casualOpeners = ['Honestly,', 'Look,', "Here's the thing —", 'Worth noting:', 'And honestly,'];
            const academicOpeners = ['Notably,', 'Importantly,', 'Critically,', 'In particular,', 'Significantly,'];
            const openers = vibe === 'academic' ? academicOpeners : casualOpeners;
            const opener = openers[Math.floor(Math.random() * openers.length)];
            return `${opener} ${s.charAt(0).toLowerCase() + s.slice(1)}`;
        }

        // Pattern 2: "It is [important/crucial/clear/essential/worth/necessary]..."
        const itIsMatch = s.match(/^It (is|was|has been) (important|crucial|essential|clear|obvious|evident|worth|necessary|key)/i);
        if (itIsMatch) {
            const openers = ["And it's genuinely", "Honestly, it's", "That makes it"];
            const opener = openers[Math.floor(Math.random() * openers.length)];
            const rest = s.slice(itIsMatch[0].length);
            return `${opener} ${itIsMatch[2].toLowerCase()}${rest}`;
        }

        // Pattern 3: "There are/is..."
        const thereMatch = s.match(/^There (are|is) /i);
        if (thereMatch) {
            const rest = s.slice(thereMatch[0].length);
            const openers = ["You'll find ", "Expect to see ", "There's actually "];
            return openers[Math.floor(Math.random() * openers.length)] + rest;
        }

        // Pattern 4: "This [noun]..." → "And this [noun]..."
        if (/^This \w+/.test(s) && Math.random() > 0.5) {
            return `And this${s.slice(4)}`;
        }

        return sentence;
    });

    return diversified.join(' ');
}

/**
 * Paragraph Rhythm Controller (Layer 9 — V11 NEW)
 * Injects single-line "punch" paragraphs for human-like paragraph irregularity.
 * Research: Human paragraph CoV = 43.76 vs AI = 27.05.
 * Humans use isolated 1-sentence paragraphs for rhetorical emphasis.
 */
export function applyParagraphRhythm(text: string): string {
    const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);
    if (paragraphs.length < 2) return text;

    const result: string[] = [];

    for (let i = 0; i < paragraphs.length; i++) {
        const para = paragraphs[i];

        // Skip bullet/numbered list paragraphs — rhythm extraction would break list structure
        const bulletLines = (para.match(/^[\s]*[-*•\d][\.\)]?\s/gm) || []).length;
        const totalLines = para.split('\n').filter(l => l.trim()).length;
        if (bulletLines / Math.max(totalLines, 1) > 0.4) {
            result.push(para);
            continue;
        }

        const doc = nlp.readDoc(para);
        const sentences = doc.sentences().out() as string[];

        // V12.1 FIX: Lowered from every 3rd to every 2nd paragraph, and from 4+ to 3+ sentences
        // Also require 3+ sentences in the paragraph to extract one
        if (sentences.length >= 3 && i % 2 === 1) {
            // Find the best "punch" sentence: short (4–12 words), declarative (no question marks), not the first sentence
            const candidates = sentences
                .map((s, idx) => ({
                    s: s.trim(),
                    idx,
                    wordCount: s.trim().split(/\s+/).length
                }))
                .filter(x => x.wordCount >= 4 && x.wordCount <= 12 && !x.s.includes('?') && x.idx > 0 && x.idx < sentences.length - 1);

            if (candidates.length > 0) {
                // Pull the shortest qualifying sentence as a solo paragraph
                const punch = candidates.sort((a, b) => a.wordCount - b.wordCount)[0];
                const remaining = sentences.filter((_, idx) => idx !== punch.idx);

                if (remaining.length >= 2) {
                    result.push(remaining.join(' '));
                    result.push(punch.s); // Solo emphasis paragraph
                    continue;
                }
            }
        }

        result.push(para);
    }

    return result.join('\n\n');
}

// ─── V12 NEW FUNCTIONS ──────────────────────────────────────────────────────────────────────

/**
 * Deictic & Pronoun Injection (V12 NEW)
 * Research: GPTZero 2025 pronoun-rate classifier — "first-person pronoun rate < 0.8% is a strong AI signal."
 * Human avg: 3.2 "you/I/we" per 100 words. AI avg: 0.4 per 100 words.
 * Injects "you"/"we" address + deictic anchors ("here", "now", "at this point").
 */
export function applyDeicticInjection(text: string, vibe: 'academic' | 'casual' | 'genz' = 'casual'): string {
    const paragraphs = text.split(/\n\n+/);
    if (paragraphs.length > 1) {
        return paragraphs.map(p => applyDeicticInjection(p, vibe)).join('\n\n');
    }

    // Skip bullet/numbered list paragraphs
    const bulletLines = (text.match(/^[\s]*[-*•\d][\.\)]?\s/gm) || []).length;
    const lineCount = text.split('\n').filter(l => l.trim()).length;
    if (bulletLines / Math.max(lineCount, 1) > 0.4) return text;

    const doc = nlp.readDoc(text);
    const sentences = doc.sentences().out() as string[];
    if (sentences.length < 3) return text;

    // Casual bridges inject "you" address
    const casualBridges = [
        ' — and you\'ll notice this quickly',
        ' — worth thinking about, honestly',
        ', which matters more than you\'d think',
        ' — and that\'s the part that catches people off guard',
        ', if you really look at it',
    ];
    // Academic bridges inject "we" framing
    const academicBridges = [
        ', as we can observe here',
        ' — something we should note at this point',
        ', and this distinction matters for our understanding',
        ', which we find particularly relevant',
        ' — and here the pattern becomes clear',
    ];
    // Deictic anchors (added as sentence starters)
    const deicticStarters = [
        'At this point, ',
        'Right now, ',
        'Here, ',
        'Now, ',
    ];

    const bridges = vibe === 'academic' ? academicBridges : casualBridges;
    // V12.1: Higher bridge probability for academic (needs "we" pronouns to pass detector)
    const bridgeProb = vibe === 'academic' ? 0.70 : 0.55;
    const result = sentences.map((s, idx) => {
        // V12.1 FIX: Removed "not last sentence" guard — it's OK to modify final sentence
        // Bridge phrase injection on idx=2, 5, 8 etc.
        if (idx > 0 && (idx + 1) % 3 === 0 && Math.random() < bridgeProb) {
            const bridge = bridges[Math.floor(Math.random() * bridges.length)];
            const trimmed = s.trim();
            if (trimmed.endsWith('.')) {
                return trimmed.slice(0, -1) + bridge + '.';
            }
            return trimmed + bridge;
        }
        // Deictic starter injection for idx>=3
        if (idx >= 3 && Math.random() < 0.35) {
            const starter = deicticStarters[Math.floor(Math.random() * deicticStarters.length)];
            const trimmed = s.trim();
            return starter + trimmed.charAt(0).toLowerCase() + trimmed.slice(1);
        }
        return s;
    });

    // V12.1 FIX: Phrase-aware pronoun injection (prevents "healthcare you" broken grammar)
    // Only replace when target noun follows a determiner, preposition, or verb — NOT another noun
    let joined = result.join(' ');
    if (vibe !== 'academic') {
        const safePrefix = /(?:(?:^|[.!?]\s+)|(?:(?:the|these|those|for|to|by|from|with|among|between|enable|enabling|help|helping|allow|allowing|empower|empowering) ))(?:users|individuals|people|professionals|stakeholders|participants|researchers|practitioners|consumers|audiences|learners|readers|developers)/gi;
        joined = joined.replace(safePrefix, (match) => {
            if (Math.random() < 0.40) {
                // Preserve the prefix part, replace only the noun
                const lastSpace = match.lastIndexOf(' ');
                if (lastSpace > 0) {
                    return match.substring(0, lastSpace + 1) + 'you';
                }
                return 'You'; // Sentence start
            }
            return match;
        });
        // Also inject "we" for collective impersonal phrases
        joined = joined.replace(/\b(one can|one could|it is possible to|it can be)\b/gi, (match) => {
            if (Math.random() < 0.4) return 'we can';
            return match;
        });
    }

    // V12.1: Pronoun floor guarantee — if NO first/second person pronouns exist,
    // force-inject one bridge into the 2nd sentence to ensure minimum pronoun rate.
    // This prevents random-chance zero-pronoun outputs that fail AI detection.
    const pronounCheck = joined.match(/\b(you|your|you're|you'll|you'd|I|I'm|I've|I'll|we|we're|we've|our|us|myself|ourselves)\b/g);
    if (!pronounCheck || pronounCheck.length === 0) {
        // Find the 2nd sentence and inject a pronoun bridge
        const sentenceSplit = joined.match(/[^.!?]+[.!?]+/g);
        if (sentenceSplit && sentenceSplit.length >= 2) {
            const targetIdx = 1; // 2nd sentence
            const s = sentenceSplit[targetIdx].trim();
            const fallbackBridge = vibe === 'academic'
                ? ', as we can observe here'
                : ', and you\'ll notice this quickly';
            if (s.endsWith('.')) {
                sentenceSplit[targetIdx] = ' ' + s.slice(0, -1) + fallbackBridge + '.';
            } else {
                sentenceSplit[targetIdx] = ' ' + s + fallbackBridge;
            }
            joined = sentenceSplit.join('');
        }
    }

    return joined;
}

/**
 * Morphological Denominalization (V12 NEW)
 * Research: Biber (1988) — "Variation Across Speech and Writing".
 * AI over-nominalizes: "the implementation of" → "implementing".
 * Turnitin 2025 + Originality.ai both flag high nominalization rate.
 */
export function applyDenominalization(text: string): string {
    const paragraphs = text.split(/\n\n+/);
    if (paragraphs.length > 1) {
        return paragraphs.map(p => applyDenominalization(p)).join('\n\n');
    }

    // Skip bullet/numbered list paragraphs
    const bulletLines = (text.match(/^[\s]*[-*•\d][\.\)]?\s/gm) || []).length;
    const lineCount = text.split('\n').filter(l => l.trim()).length;
    if (bulletLines / Math.max(lineCount, 1) > 0.4) return text;

    let output = text;

    // 18 high-priority denominalization patterns — each applied at ~40% rate
    const patterns: [RegExp, string][] = [
        [/\bthere is a need (for|to)\b/gi, 'we need'],
        [/\bmake a decision\b/gi, 'decide'],
        [/\bhave an effect on\b/gi, 'affect'],
        [/\bprovide support (for|to)\b/gi, 'support'],
        [/\bgive consideration to\b/gi, 'consider'],
        [/\breach a conclusion\b/gi, 'conclude'],
        [/\bcome to an agreement\b/gi, 'agree'],
        [/\btake into account\b/gi, 'consider'],
        [/\bput in place\b/gi, 'set up'],
        [/\bbring about (a )?change\b/gi, 'change'],
        [/\bthe implementation of\b/gi, 'implementing'],
        [/\bthe development of\b/gi, 'developing'],
        [/\bthe establishment of\b/gi, 'establishing'],
        [/\bthe utilization of\b/gi, 'using'],
        [/\bthe application of\b/gi, 'applying'],
        [/\bthe improvement of\b/gi, 'improving'],
        [/\bthe introduction of\b/gi, 'introducing'],
        [/\bthe integration of\b/gi, 'integrating'],
    ];

    for (const [regex, replacement] of patterns) {
        output = output.replace(regex, (match) => {
            // V12.1: Increased rate from 40% to 65% to reliably catch nominalizations
            if (Math.random() > 0.65) return match;
            // Preserve sentence start capitalization
            if (match.charAt(0) === match.charAt(0).toUpperCase()) {
                return replacement.charAt(0).toUpperCase() + replacement.slice(1);
            }
            return replacement;
        });
    }

    return output;
}

/**
 * Clause Reordering — Dependency Parse Simulation (V12 NEW)
 * Research: Stamatatos (2009) — authorship attribution via syntactic features.
 * Turnitin 2025 checks SVO chains with trailing subordinates as AI signal.
 * Moves trailing because/since/although clauses to front position on ~35% of matches.
 */
export function applyClauseReordering(text: string): string {
    const paragraphs = text.split(/\n\n+/);
    if (paragraphs.length > 1) {
        return paragraphs.map(p => applyClauseReordering(p)).join('\n\n');
    }

    // Skip bullet/numbered list paragraphs
    const bulletLines = (text.match(/^[\s]*[-*•\d][\.\)]?\s/gm) || []).length;
    const lineCount = text.split('\n').filter(l => l.trim()).length;
    if (bulletLines / Math.max(lineCount, 1) > 0.4) return text;

    const doc = nlp.readDoc(text);
    const sentences = doc.sentences().out() as string[];

    const reordered = sentences.map(sentence => {
        const s = sentence.trim();
        // Only apply to ~35% of eligible sentences
        if (Math.random() > 0.35) return sentence;

        // Pattern: "[Main clause], because/since/although/while/whereas [sub clause]."
        const trailingMatch = s.match(/^(.{15,}?),?\s+(because|since|although|while|whereas|even though|given that)\s+(.+)\.$/i);
        if (trailingMatch) {
            const mainClause = trailingMatch[1].trim();
            const conjunction = trailingMatch[2];
            const subClause = trailingMatch[3].trim().replace(/\.$/, '');
            // Flip: "Because [sub], [main]."
            const flipped = `${conjunction.charAt(0).toUpperCase() + conjunction.slice(1)} ${subClause}, ${mainClause.charAt(0).toLowerCase() + mainClause.slice(1)}.`;
            return flipped;
        }

        return sentence;
    });

    return reordered.join(' ');
}

/**
 * Semantic Coherence Variance — Anti-Robot Drift (V12 NEW)
 * Research: McCarthy et al. (2010) + Originality.ai documentation.
 * AI text has anomalously HIGH adjacent-sentence similarity (0.84 vs human 0.61).
 * Injects hedging/personalizing bridge phrases to break sentence-similarity chains.
 */
export function applySemanticDrift(text: string, vibe: 'academic' | 'casual' | 'genz' = 'casual'): string {
    const paragraphs = text.split(/\n\n+/);
    if (paragraphs.length > 1) {
        return paragraphs.map(p => applySemanticDrift(p, vibe)).join('\n\n');
    }

    // Skip bullet/numbered list paragraphs
    const bulletLines = (text.match(/^[\s]*[-*•\d][\.\)]?\s/gm) || []).length;
    const lineCount = text.split('\n').filter(l => l.trim()).length;
    if (bulletLines / Math.max(lineCount, 1) > 0.4) return text;

    const doc = nlp.readDoc(text);
    const sentences = doc.sentences().out() as string[];
    if (sentences.length < 3) return text;

    // V12.1 FIX: Vibe-aware drift bridges
    const casualBridges = [
        ' — though context matters here',
        ', at least in most cases',
        ' (worth pausing on, honestly)',
        ' — or that\'s how it tends to play out',
        ', depending on how you look at it',
        ' — and this is the part that trips people up',
        ', which is more nuanced than it sounds',
        ' — but that\'s a whole other thing',
    ];
    const academicBridges = [
        ', though this warrants further analysis',
        ', at least within the scope examined here',
        ' — a distinction that merits attention',
        ', which complicates the broader picture',
        ', though the evidence remains mixed',
        ' — a point often overlooked in the literature',
    ];
    const driftBridges = vibe === 'academic' ? academicBridges : casualBridges;

    let lastBridgeIdx = -3;

    const result = sentences.map((s, idx) => {
        // V12.1 FIX: Simplified targeting — fire on idx=2, then every 3rd after
        // Old approach with targetGap=4-5 and idx%targetGap never fired on short paragraphs
        if (idx < 1 || idx === sentences.length - 1) return s;
        if (idx - lastBridgeIdx < 2) return s;
        if ((idx + 1) % 3 !== 0) return s; // Fires on idx=2, 5, 8
        if (Math.random() > 0.50) return s;

        const bridge = driftBridges[Math.floor(Math.random() * driftBridges.length)];
        const trimmed = s.trim();
        lastBridgeIdx = idx;

        if (trimmed.endsWith('.')) {
            return trimmed.slice(0, -1) + bridge + '.';
        }
        return trimmed + bridge;
    });

    return result.join(' ');
}

/**
 * Zipf's Law Frequency Normalizer (V12 NEW)
 * Research: Zipf (1949), Galle (2014) — GPTZero uses Zipf deviation as secondary signal.
 * AI text deviates from Zipf: mid-frequency words appear too uniformly.
 * We identify over-represented mid-frequency words and thin 30% of their occurrences.
 */
export function applyZipfNormalization(text: string): string {
    const paragraphs = text.split(/\n\n+/);
    if (paragraphs.length > 1) {
        return paragraphs.map(p => applyZipfNormalization(p)).join('\n\n');
    }

    // Skip bullet/numbered list paragraphs
    const bulletLines = (text.match(/^[\s]*[-*•\d][\.\)]?\s/gm) || []).length;
    const lineCount = text.split('\n').filter(l => l.trim()).length;
    if (bulletLines / Math.max(lineCount, 1) > 0.4) return text;

    const words = text.match(/\b[a-z']+\b/gi) || [];
    if (words.length < 20) return text; // Too short for meaningful frequency analysis

    // Count word frequencies
    const freq = new Map<string, number>();
    const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'it', 'its', 'this', 'that', 'and', 'but', 'or', 'not', 'so', 'if']);
    for (const w of words) {
        const lower = w.toLowerCase();
        if (stopWords.has(lower) || lower.length <= 2) continue;
        freq.set(lower, (freq.get(lower) || 0) + 1);
    }

    // Sort by frequency descending → get ranked list
    const ranked = Array.from(freq.entries()).sort((a, b) => b[1] - a[1]);
    if (ranked.length < 5) return text;

    // Compute expected Zipf frequency: f(r) = C / r^α where α ≈ 1.07
    const C = ranked[0][1]; // Highest frequency = constant
    const alpha = 1.07;

    // Find over-represented words (actual > expected * 1.3) in ranks 3–15
    const overRepresented = new Set<string>();
    for (let r = 2; r < Math.min(ranked.length, 15); r++) {
        const [word, actualFreq] = ranked[r];
        const expectedFreq = C / Math.pow(r + 1, alpha);
        if (actualFreq > expectedFreq * 1.3 && actualFreq >= 3) {
            overRepresented.add(word);
        }
    }

    if (overRepresented.size === 0) return text;

    // Thin 30% of over-represented word occurrences by replacing with lighter synonym or omitting
    const lightSynonyms: Record<string, string[]> = {
        'also': ['too', 'as well'],
        'these': ['such', 'those'],
        'more': ['further', 'added'],
        'other': ['additional', 'separate'],
        'most': ['many', 'plenty of'],
        'much': ['significantly', 'substantially'],
        'such': ['these', 'those'],
        'even': ['actually', 'in fact'],
        'still': ['yet', 'regardless'],
        'both': ['each', 'the two'],
    };

    let output = text;
    const overRepWords = Array.from(overRepresented);
    for (const word of overRepWords) {
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        const alts = lightSynonyms[word];
        output = output.replace(regex, (match) => {
            if (Math.random() > 0.30) return match; // Keep 70%
            if (alts && alts.length > 0) {
                const alt = alts[Math.floor(Math.random() * alts.length)];
                if (match.charAt(0) === match.charAt(0).toUpperCase()) {
                    return alt.charAt(0).toUpperCase() + alt.slice(1);
                }
                return alt;
            }
            return match; // No synonym available, keep original
        });
    }

    return output;
}

// ─── Verification Metrics (Layer 6 Support) ────────────────────────────────────────────────

export const AI_CLICHES = [
    // Category A: Structural Openers (AI transition words)
    "in conclusion", "furthermore", "moreover", "additionally", "in addition",
    "to summarize", "in summary", "as a result", "therefore", "consequently",
    "nevertheless", "nonetheless", "first and foremost", "last but not least",
    "needless to say", "that being said", "with that said",
    "it goes without saying", "all in all",
    // Category B: Hedging & Signposting Phrases
    "it is worth noting", "it's worth noting", "it should be noted that",
    "it is important to note", "it is essential to", "it is clear that",
    "it is crucial to", "there is a need to", "when it comes to",
    "in order to", "with respect to", "in terms of", "with regard to",
    "in light of", "due to the fact that", "as a result of",
    "as previously mentioned", "as mentioned above",
    // Category C: Corporate Buzzwords
    "delve into", "delve", "a tapestry of", "tapestry", "testament",
    "seamlessly", "holistic", "robust", "utilize", "leverage", "synergy",
    "synergize", "empower", "transformative", "impactful", "actionable",
    "scalable", "innovative", "ecosystem", "landscape", "journey",
    "streamline", "cutting-edge", "state-of-the-art", "game-changer",
    "paradigm shift", "revolutionize", "thought leader", "deep dive",
    "best practices", "key takeaways", "move the needle", "circle back",
    // Category D: Weak Intensifiers
    "multifaceted", "nuanced", "crucial", "foster", "facilitate",
    "underscore", "underscores", "underpins", "navigating", "showcasing",
    "at its core", "in the realm of", "in today's world", "elevate",
    "paradigm", "plays a crucial role", "plays an important role",
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

// ─── Headless Verification Agent (Layer 6 — In-House AI Detector) ──────────────────────────

export interface VerificationReport {
    /** Overall "human" score 0–100. Higher = more human-like. */
    humanScore: number;
    /** true if text passes all thresholds and is safe to ship */
    passed: boolean;
    /** Individual metric breakdowns */
    metrics: {
        burstiness: { score: number; verdict: string };
        cliches: { count: number; score: number; verdict: string };
        vocabRepetition: { ratio: number; score: number; verdict: string };
        sentenceUniformity: { coefficientOfVariation: number; score: number; verdict: string };
        conjunctionDensity: { density: number; score: number; verdict: string };
        pronounRate: { rate: number; score: number; verdict: string };
        nominalizationRate: { rate: number; score: number; verdict: string };
    };
    /** Which metrics failed (empty = all passed) */
    failures: string[];
}

/**
 * Headless Verification Agent — In-House AI Detector (100% free, no external API)
 *
 * Runs 5 proven statistical checks that real AI detectors use internally:
 * 1. Burstiness: sentence length variance (AI = monotone, humans = bursty)
 * 2. Cliche count: AI fingerprint phrases
 * 3. Vocabulary repetition: word reuse ratio (AI repeats, humans vary)
 * 4. Sentence uniformity: coefficient of variation of sentence lengths
 * 5. Conjunction density: overuse of connectors like "and", "but", "however"
 *
 * Returns a detailed report with per-metric scores and an overall human score.
 */
export function runVerificationAgent(text: string): VerificationReport {
    const failures: string[] = [];

    // ── Metric 1: Burstiness (reuse existing) ──
    const burstyScore = computeBurstiness(text);
    const burstyVerdict = burstyScore >= 30 ? 'PASS' : 'FAIL';
    if (burstyVerdict === 'FAIL') failures.push('burstiness');

    // ── Metric 2: Cliche count (reuse existing) ──
    const clicheResult = computeCliche(text);
    const clicheVerdict = clicheResult.count <= 2 ? 'PASS' : 'FAIL';
    if (clicheVerdict === 'FAIL') failures.push('cliches');

    // ── Metric 3: Vocabulary Repetition Ratio ──
    // Measures: (unique words / total words). AI tends to reuse words → low ratio.
    // Humans use more varied vocabulary → higher ratio.
    const allWords = text.toLowerCase().match(/\b[a-z']+\b/g) || [];
    const stopWords = new Set([
        'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
        'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
        'should', 'may', 'might', 'shall', 'can', 'to', 'of', 'in', 'for',
        'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during',
        'before', 'after', 'it', 'its', 'this', 'that', 'these', 'those',
        'i', 'we', 'you', 'he', 'she', 'they', 'me', 'him', 'her', 'us',
        'them', 'my', 'our', 'your', 'his', 'their', 'and', 'but', 'or',
        'not', 'no', 'so', 'if', 'then', 'than', 'when', 'what', 'which',
        'who', 'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most',
        'other', 'some', 'such', 'only', 'own', 'same', 'just', 'also', 'very'
    ]);
    const contentWords = allWords.filter(w => !stopWords.has(w) && w.length > 2);
    const uniqueContent = new Set(contentWords);
    const vocabRatio = contentWords.length > 0 ? uniqueContent.size / contentWords.length : 1;
    // Score: 0.6+ ratio = good variety (100), 0.3 or below = very robotic (0)
    const vocabScore = Math.min(100, Math.round(Math.max(0, (vocabRatio - 0.3) / 0.35) * 100));
    const vocabVerdict = vocabScore >= 40 ? 'PASS' : 'FAIL';
    if (vocabVerdict === 'FAIL') failures.push('vocabRepetition');

    // ── Metric 4: Sentence Uniformity (Coefficient of Variation) ──
    // AI writes sentences of very similar length. Humans vary wildly.
    // CV = stddev / mean. Higher CV = more human. Target: CV > 0.30
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    const sentLengths = sentences.map(s => s.trim().split(/\s+/).length).filter(l => l > 1);
    let uniformityCV = 0;
    let uniformityScore = 50;
    if (sentLengths.length >= 3) {
        const mean = sentLengths.reduce((a, b) => a + b, 0) / sentLengths.length;
        const stddev = Math.sqrt(sentLengths.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / sentLengths.length);
        uniformityCV = mean > 0 ? stddev / mean : 0;
        // Score: CV >= 0.45 = very human (100), CV <= 0.10 = very robotic (0)
        uniformityScore = Math.min(100, Math.round(Math.max(0, (uniformityCV - 0.10) / 0.40) * 100));
    }
    const uniformityVerdict = uniformityScore >= 30 ? 'PASS' : 'FAIL';
    if (uniformityVerdict === 'FAIL') failures.push('sentenceUniformity');

    // ── Metric 5: Conjunction Density ──
    // AI overuses connectors. Humans use them less predictably.
    // Measures: conjunctions per sentence. Target: < 1.5 per sentence.
    const conjunctions = (text.match(/\b(and|but|however|moreover|furthermore|therefore|nevertheless|consequently|additionally|thus|hence|meanwhile|nonetheless)\b/gi) || []).length;
    const conjDensity = sentences.length > 0 ? conjunctions / sentences.length : 0;
    // Score: density <= 0.8 = natural (100), density >= 2.0 = robotic (0)
    const conjScore = Math.min(100, Math.round(Math.max(0, (2.0 - conjDensity) / 1.2) * 100));
    const conjVerdict = conjScore >= 40 ? 'PASS' : 'FAIL';
    if (conjVerdict === 'FAIL') failures.push('conjunctionDensity');

    // ── Metric 6: Pronoun Rate (V12 NEW) ──
    // Research: GPTZero 2025 — "first-person pronoun rate < 0.8% is a strong AI signal."
    // Human avg: 3.2 per 100 words. AI avg: 0.4. Target: >= 1.0 per 100 words.
    const pronouns = (text.match(/\b(you|your|you're|I|I'm|I've|I'll|we|we're|we've|our|us|myself|ourselves)\b/g) || []).length;
    const totalWordCount = allWords.length || 1;
    const pronounRatePer100 = (pronouns / totalWordCount) * 100;
    // Score: >= 2.0 per 100w = excellent (100), 0 = very robotic (0)
    const pronounScore = Math.min(100, Math.round(Math.max(0, pronounRatePer100 / 2.5) * 100));
    const pronounVerdict = pronounScore >= 20 ? 'PASS' : 'WARN';
    if (pronounVerdict === 'WARN' && pronounScore < 10) failures.push('pronounRate');

    // ── Metric 7: Nominalization Rate (V12 NEW) ──
    // Research: Biber (1988), Koppel & Schler (2004) — AI over-nominalizes.
    // "the implementation of", "the development of", etc. Target: <= 1.5 per 100 words.
    const nomPatterns = /\bthe (implementation|development|establishment|utilization|application|improvement|introduction|integration|consideration|evaluation|examination|determination|identification|investigation|interpretation|optimization|organization|preparation|presentation|recommendation) of\b/gi;
    const nomCount = (text.match(nomPatterns) || []).length;
    const nomRatePer100 = (nomCount / totalWordCount) * 100;
    // Score: 0 per 100w = perfect (100), >= 2.0 = robotic (0)
    const nomScore = Math.min(100, Math.round(Math.max(0, (2.0 - nomRatePer100) / 2.0) * 100));
    const nomVerdict = nomScore >= 40 ? 'PASS' : 'FAIL';
    if (nomVerdict === 'FAIL') failures.push('nominalizationRate');

    // ── Overall Human Score (weighted average — V12 updated) ──
    const humanScore = Math.round(
        burstyScore * 0.20 +
        clicheResult.score * 0.18 +
        vocabScore * 0.15 +
        uniformityScore * 0.15 +
        conjScore * 0.12 +
        pronounScore * 0.10 +
        nomScore * 0.10
    );

    return {
        humanScore,
        passed: failures.length === 0 && humanScore >= 50,
        metrics: {
            burstiness: { score: burstyScore, verdict: burstyVerdict },
            cliches: { count: clicheResult.count, score: clicheResult.score, verdict: clicheVerdict },
            vocabRepetition: { ratio: Math.round(vocabRatio * 100) / 100, score: vocabScore, verdict: vocabVerdict },
            sentenceUniformity: { coefficientOfVariation: Math.round(uniformityCV * 100) / 100, score: uniformityScore, verdict: uniformityVerdict },
            conjunctionDensity: { density: Math.round(conjDensity * 100) / 100, score: conjScore, verdict: conjVerdict },
            pronounRate: { rate: Math.round(pronounRatePer100 * 100) / 100, score: pronounScore, verdict: pronounVerdict },
            nominalizationRate: { rate: Math.round(nomRatePer100 * 100) / 100, score: nomScore, verdict: nomVerdict },
        },
        failures,
    };
}
