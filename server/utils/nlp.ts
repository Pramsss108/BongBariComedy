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
        'empowering': ['helping', 'enabling', 'allowing']
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

        // Detect ACTIVE: [NOUN/PRON] + [VERB] + [DET?] + [NOUN] (no AUX "be" before verb)
        const subjIdx = tokens.findIndex(t => t.pos === 'NOUN' || t.pos === 'PRON' || t.pos === 'PROPN');
        const mainVerbIdx = tokens.findIndex((t, i) => i > subjIdx && t.pos === 'VERB');
        const objStartIdx = tokens.findIndex((t, i) => i > mainVerbIdx && (t.pos === 'NOUN' || t.pos === 'PRON' || t.pos === 'PROPN'));
        const hasAuxBe = tokens.some((t, i) => i < mainVerbIdx && t.pos === 'AUX' && t.lemma === 'be');

        if (subjIdx >= 0 && mainVerbIdx > subjIdx && objStartIdx > mainVerbIdx && !hasAuxBe) {
            // ACTIVE → PASSIVE conversion
            // Gather subject, verb, object
            // Filter PUNCT and AUX — prevents "by years have" type broken grammar
            const subjectParts = tokens.slice(subjIdx, mainVerbIdx).filter(t => t.pos !== 'PUNCT' && t.pos !== 'AUX');
            const verb = tokens[mainVerbIdx];

            // Object = everything from objStartIdx to end (minus punctuation)
            const objParts = tokens.slice(objStartIdx).filter(t => t.pos !== 'PUNCT');

            if (subjectParts.length > 0 && objParts.length > 0) {
                const subjectText = subjectParts.map(t => t.text).join(' ');
                const objText = objParts.map(t => t.text).join(' ').replace(/\.$/, '');

                // Determine past participle
                const lemma = verb.lemma.toLowerCase();
                const pp = IRREGULAR_PP[lemma] || (verb.text.endsWith('ed') ? verb.text : verb.text + 'ed');

                // Determine was/were based on object (crude: plural check)
                const auxVerb = objText.toLowerCase().endsWith('s') || objText.includes(' and ') ? 'were' : 'was';

                const passiveObj = objText.charAt(0).toUpperCase() + objText.slice(1);
                return `${passiveObj} ${auxVerb} ${pp} by ${subjectText.toLowerCase()}.`;
            }
        }

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
export function applySentenceStarterDiversifier(text: string): string {
    const paragraphs = text.split(/\n\n+/);
    if (paragraphs.length > 1) {
        return paragraphs.map(p => applySentenceStarterDiversifier(p)).join('\n\n');
    }

    // Skip bullet/numbered list paragraphs — don't touch list item structure
    const bulletRatio = (text.match(/^[\s]*[-*•\d][\.\)]?\s/gm) || []).length;
    const lineCount = text.split('\n').filter(l => l.trim()).length;
    if (bulletRatio / Math.max(lineCount, 1) > 0.4) return text;

    const doc = nlp.readDoc(text);
    const sentences = doc.sentences().out() as string[];
    if (sentences.length < 2) return text;

    const diversified = sentences.map((sentence, idx) => {
        // Skip first sentence of each paragraph + only change ~25% of candidates
        if (idx === 0 || Math.random() > 0.25) return sentence;

        const s = sentence.trim();

        // Pattern 1: "The [noun] is/was/has/can/will/shows/makes/provides..."
        if (/^The \w+ (is|are|was|were|has|have|can|will|shows?|makes?|provides?|allows?|helps?)\b/i.test(s)) {
            const openers = ['Honestly,', 'Look,', "Here's the thing —", 'Worth noting:', 'And honestly,'];
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

        // Only process every 3rd paragraph to avoid over-structuring
        // Also require 4+ sentences in the paragraph to extract one
        if (sentences.length >= 4 && i % 3 === 1) {
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

    // ── Overall Human Score (weighted average) ──
    const humanScore = Math.round(
        burstyScore * 0.25 +
        clicheResult.score * 0.25 +
        vocabScore * 0.20 +
        uniformityScore * 0.15 +
        conjScore * 0.15
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
        },
        failures,
    };
}
