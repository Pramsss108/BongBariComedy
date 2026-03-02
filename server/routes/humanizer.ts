import { Express } from "express";
import admin from "firebase-admin";
import { forceBurstiness, applyVocabularyEngine, applySemanticCloaking, applyHumanFlaws, applyConjunctionPurge, applyIMFApproximation, applySentenceStarterDiversifier, applyParagraphRhythm, applyDeicticInjection, applyDenominalization, applyClauseReordering, applySemanticDrift, applyZipfNormalization, applyHumanPatterns, computeBurstiness, computeCliche, runVerificationAgent } from "../utils/nlp";

// In-Memory Device Fingerprint Tracker to prevent Account Sharing
const userActiveDevices = new Map<string, string>();

// Ensure Firebase Admin is initialized so we can verify JWT tokens.
// A full Service Account is NOT required just to verify tokens, only the projectId.
if (admin.apps.length === 0) {
    admin.initializeApp({ projectId: process.env.VITE_FIREBASE_PROJECT_ID || "bong-bari" });
}

export function registerHumanizerRoutes(app: Express, sessions: Map<string, any>, getDeviceIdFromReq: Function) {
    // V10 Security Lockdown: No Anonymous Access to the Cloud Engine
    // The previous rate limiter for anonymous users has been permanently removed.

    app.post("/api/humanize/groq", async (req, res) => {
        try {
            const deviceId = getDeviceIdFromReq(req);
            let isAuthenticated = false;
            let authenticatedUid = "";

            // Check for Firebase Auth Token
            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.startsWith('Bearer ')) {
                const idToken = authHeader.split('Bearer ')[1].trim();
                try {
                    // Try to verify the Firebase token
                    if (admin.apps.length > 0) {
                        const decodedToken = await admin.auth().verifyIdToken(idToken);
                        isAuthenticated = true; // JWT is valid!
                        authenticatedUid = decodedToken.uid;
                    }
                } catch (err: any) {
                    console.error("Invalid Firebase token presented to Humanizer:", err.message || err);
                }
            }

            // 1. V10 Absolute Authentication Lockdown
            if (!isAuthenticated) {
                console.warn(`[Security Alert] Unauthenticated access attempt to V12 Cloud Pipeline from ${deviceId}`);
                return res.status(401).json({ error: "Unauthorized", message: "Authentication required to access the BongBari V12 Cloud Engine." });
            }

            // 3. Extract configuration
            const { prompt, vibe = 'casual', flawLevel = 'low', intensity = 'balanced', override = false } = req.body || {};

            // 2. Anti-Sharing Device Fingerprinting System
            // Binds an account strictly to the first device that uses it during the server lifecycle
            if (!userActiveDevices.has(authenticatedUid) || override === true) {
                userActiveDevices.set(authenticatedUid, deviceId);
            } else if (userActiveDevices.get(authenticatedUid) !== deviceId) {
                console.warn(`[Security Alert] Account sharing detected for UID ${authenticatedUid}. Binding mismatch.`);
                // V10 UPGRADE: Return 409 Conflict so the frontend can offer an "Override/Kick" option
                return res.status(409).json({
                    error: "Device Mismatch",
                    message: "This account is bound to another device.",
                    currentDevice: deviceId,
                    boundDevice: userActiveDevices.get(authenticatedUid)
                });
            }

            if (!prompt) {
                return res.status(400).json({ error: "Prompt is required" });
            }

            // 3. Environment Variable Security Check
            const apiKey = process.env.GROQ_API_KEY;
            if (!apiKey) {
                return res.status(500).json({ error: "Server Configuration Error", message: "Groq API key not configured on server" });
            }

            // Helper for fast internal API calls to Groq
            // V10 PART 1: Typical Sampling Integration (Now heavily user-controlled via 'Intensity')
            // Utilizing top_p to trim the highly predictable tokens and force the AI into human-like entropy bands.
            const callGroq = async (messages: any[], temp: number, topP: number, model: string = "llama-3.3-70b-versatile") => {
                const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${apiKey}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ model, messages, temperature: temp, top_p: topP, max_tokens: 4096 })
                });
                if (!groqRes.ok) {
                    const errText = await groqRes.text();
                    console.error("Groq Checkpoint Error:", errText);
                    throw new Error("Groq API Failure");
                }
                const data = await groqRes.json();
                return data.choices?.[0]?.message?.content?.trim() || "";
            }

            // Word count bounds (V8 Constraints)
            const wordCount = prompt.trim().split(/\s+/).length;
            const minWords = Math.max(10, Math.floor(wordCount * 0.90));
            const maxWords = Math.floor(wordCount * 1.10);

            // ==========================================
            // PHASE 1: Input Intelligence — Sparse vs Dense Detection
            // ==========================================
            // Sparse = bullets, short blocks, outlines, mixed notes (avg block < 6 words)
            // Dense  = full paragraphs of AI prose (avg block >= 6 words)
            const nonEmptyLines = prompt.split('\n').filter((l: string) => l.trim().length > 0);
            const avgLineWords = nonEmptyLines.length > 0
                ? nonEmptyLines.reduce((acc: number, l: string) => acc + l.trim().split(/\s+/).length, 0) / nonEmptyLines.length
                : 0;
            const isSparse = avgLineWords < 6 || nonEmptyLines.length > wordCount * 0.4;

            console.log(`[Humanizer V12] Mode: ${isSparse ? 'HOLISTIC (sparse input)' : 'AST-BLOCK (dense prose)'} | AvgLineWords: ${avgLineWords.toFixed(1)} | Target: ${minWords}-${maxWords}w`);

            // ==========================================
            // PHASE 2: Vibe & Flaw Vectors
            // ==========================================
            let temperature = 0.7;

            let vibePrompt = "";
            if (vibe === 'genz') {
                temperature = 0.95;
                vibePrompt = "VIBE: Gen-Z. Erratic conversational pacing. Occasional natural casual phrasing ('honestly,', 'not gonna lie'). No forced slang. Lowercase some words unpredictably.";
            } else if (vibe === 'academic') {
                // V12.5: Raised from 0.40 — was too conservative, produced pure synonym swaps
                temperature = 0.55;
                vibePrompt = "VIBE: Academic. Precise, collegiate vocabulary. Formal structure. Zero contractions. Zero slang.";
            } else {
                // V12.5: Raised from 0.55 to 0.80 — CRITICAL fix. At 0.55 the model just does synonym
                // swapping and keeps sentence structure identical. 0.80 forces genuine restructuring.
                temperature = 0.80;
                vibePrompt = "VIBE: Casual. Natural tone — like a human blogger. Contractions always (it's, don't, can't, that's, they're). Direct and punchy.";
            }

            let flawPrompt = "";
            if (flawLevel === 'high') {
                flawPrompt = "FLAWS: High. Add 1-2 minor natural imperfections — a missing comma, slightly loose phrasing, or a casual run-on — to mimic real human typing.";
            } else if (flawLevel === 'low') {
                flawPrompt = "FLAWS: Low. Use contractions naturally. Mostly correct but not robotic-perfect.";
            } else {
                flawPrompt = "FLAWS: None. Grammatically perfect output.";
            }

            // ==========================================
            // PHASE 3: Prompt Selection — Holistic or AST-Block
            // ==========================================

            // HOLISTIC MODE: For sparse/bullet/mixed/short input
            // Treats entire input as one document — LLM has full context for every line
            const hasBullets = /^[\s]*[-*•]\s/m.test(prompt) || /^[\s]*\d+\.\s/m.test(prompt);
            const bulletRule = hasBullets
                ? `FORMATTING LOCK: The input contains bullet points or numbered lists. Your output MUST preserve the EXACT same format — if input uses "- item", output uses "- item". If input uses "1. item", output uses "1. item". Never convert bullets to prose sentences. Never drop the list markers.`
                : `STRUCTURE: Use short paragraphs. Mix 1-sentence paragraphs with longer ones for human-like rhythm.`;

            const buildHolisticPrompt = () => `You are a human ghostwriter. You take AI-generated text and COMPLETELY REBUILD it as a human would naturally write it. You are NOT doing synonym replacement — you are creating NEW sentences that express the same ideas.

STUDY THIS EXAMPLE CAREFULLY:

INPUT: "Artificial intelligence has become an essential part of modern technology, allowing systems to analyze data, recognize patterns, and automate decision-making processes. These systems are designed to improve efficiency and reduce the need for manual effort in repetitive tasks."

WRONG (synonym swap — AI detectors catch this instantly):
"AI is now a key part of modern tech, enabling systems to analyze data, spot patterns, and make decisions automatically. They're designed to boost efficiency and cut down on manual work."

RIGHT (rebuilt from scratch — undetectable):
"Data analysis, pattern recognition, automated decisions — AI handles all of that now. It's not just a buzzword anymore. The whole point? Cutting out repetitive grunt work so people don't have to."

WHY the RIGHT version works:
- Completely different sentence structure (starts with a list, not "AI is...")
- Em-dash creates human rhythm
- Very short sentence in the middle ("It's not just a buzzword anymore.")
- Rhetorical question fragment ("The whole point?")
- Different framing ("so people don't have to" vs "reduce the need for manual effort")

${vibePrompt}
${flawPrompt}

RULES (in priority order):
1. STRUCTURAL REBUILD (CRITICAL): Do NOT map input sentences to output sentences 1:1. Merge 2 input ideas into 1 sentence. Split 1 long input idea into 2-3 short sentences. Change how ideas are framed: "X leads to Y" → "Y? That's because of X." or "Without X, no Y." Your sentence sequence MUST be different from the input.
2. BURSTINESS (CRITICAL): Mix sentence lengths dramatically. Every paragraph MUST have at least one sentence under 7 words ("That's the point.", "Not always.", "It depends."). At least one sentence should be 20+ words. This single feature is what separates human from AI.
3. HUMAN SENTENCE STARTERS: Start 3+ sentences with "And", "But", "So", "Still", "Yet". Use at least one em-dash aside mid-sentence — like this. Use at least one sentence fragment or rhetorical question.
4. MEANING LOCK: Use ONLY facts from the input. Never add examples, topics, opinions, or statistics not in the original.
5. WORD COUNT: Stay within ±10% of input word count. Restructuring ≠ expanding.
6. NO AI FINGERPRINTS: Never start with Furthermore/Moreover/Additionally/Therefore/In conclusion. Never use delve/tapestry/seamlessly/holistic/robust/utilize/leverage/paradigm.
7. CONTRACTIONS: Always use (it's, don't, can't, that's, they're, won't, isn't, aren't, doesn't, hasn't).
8. ${bulletRule}
9. NO FILLER: Never add "more or less", "generally speaking", "you know".
10. OUTPUT ONLY the rewritten text.`;

            // AST-BLOCK MODE: For dense AI prose paragraphs
            const buildASTPrompt = () => `You are a human ghostwriter in AST mode. COMPLETELY REBUILD each block's sentences — not synonym swap.

EXAMPLE:
INPUT: <block id="1">Artificial intelligence has become an essential part of modern technology, allowing systems to analyze data, recognize patterns, and automate decision-making processes.</block>
WRONG: <block id="1">AI is now a key part of modern tech, enabling systems to analyze data, spot patterns, and make decisions automatically.</block>
RIGHT: <block id="1">Data analysis, pattern recognition, automated decisions — AI handles all of it now. It's become a core piece of how modern tech actually works.</block>

${vibePrompt}
${flawPrompt}

RULES:
1. STRUCTURAL REBUILD: Do NOT map input sentences 1:1. Merge, split, reframe. "X leads to Y" → "Y? That's X at work." Sentence sequence MUST differ from input.
2. BURSTINESS: Each block MUST mix very short (3-7 word) sentences with longer ones (20+ words). Use fragments, rhetorical questions.
3. HUMAN STARTERS: Use "And", "But", "So", "Still" to start 2+ sentences. Use em-dashes for asides.
4. MEANING LOCK: Only facts from the original. No new topics/opinions.
5. WORD COUNT: Total ${minWords}–${maxWords} words.
6. AST LOCK: Same <block id="X">...</block> tags. No merge/drop.
7. NO AI WORDS: No Furthermore/Moreover/Additionally/Therefore. No delve/tapestry/seamlessly/holistic/robust.
8. CONTRACTIONS: Always (it's, don't, can't, that's, they're).
9. NO FILLER: No "more or less", "generally speaking".

OUTPUT: ONLY valid XML blocks.`;

            // ==========================================
            // PHASE 4: AST Tokenization (Dense mode only)
            // ==========================================
            const lines = prompt.split('\n');
            const lineMap: { id: number, prefix: string, core: string, isBlank: boolean }[] = [];
            let tokenizedPrompt = "";
            let blockId = 1;

            if (!isSparse) {
                lines.forEach((line: string) => {
                    const trimmed = line.trim();
                    if (!trimmed) {
                        lineMap.push({ id: -1, prefix: line, core: "", isBlank: true });
                    } else {
                        let prefix = "";
                        let coreText = line;
                        const match = line.match(/^([ \t]*[*\-•>]\s*|[ \t]*\d+\.\s*|[ \t]+)/);
                        if (match) { prefix = match[1]; coreText = line.substring(prefix.length); }
                        lineMap.push({ id: blockId, prefix, core: coreText, isBlank: false });
                        tokenizedPrompt += `<block id="${blockId}">${coreText}</block>\n`;
                        blockId++;
                    }
                });
            }

            // ==========================================
            // PHASE 5: Execution
            // ==========================================
            const msgs = isSparse
                ? [
                    { role: "system", content: buildHolisticPrompt() },
                    { role: "user", content: `Rewrite this as natural human writing:\n\n${prompt}` }
                  ]
                : [
                    { role: "system", content: buildASTPrompt() },
                    { role: "user", content: `HUMANIZE THIS EXACT XML AST STRUCTURE. OUTPUT ONLY XML:\n\n${tokenizedPrompt}` }
                  ];

            let bestVariant = "";
            let targetTemp = temperature;
            let targetTopP = 0.9;

            if (intensity === 'safe') { targetTemp = Math.min(targetTemp, 0.4); targetTopP = 0.75; }
            if (intensity === 'wild') { targetTemp = 0.95; targetTopP = 0.98; }

            let report: any = null;
            try {
                const rawLLMOutput = await callGroq(msgs, targetTemp, targetTopP, "llama-3.3-70b-versatile");

                if (isSparse) {
                    // HOLISTIC MODE: Output is plain text — use directly, no XML parsing needed
                    bestVariant = rawLLMOutput.trim();
                } else {
                    // AST-BLOCK MODE: Deserialize XML blocks back into original structure
                    const blockMap = new Map<number, string>();
                    const regex = /<block id="?(\d+)"?>([\s\S]*?)<\/block>/g;
                    let match;
                    while ((match = regex.exec(rawLLMOutput)) !== null) {
                        const id = parseInt(match[1]);
                        const content = match[2].trim();
                        blockMap.set(id, content);
                    }

                // Perfect Reconstruction Sequence
                    const reconstructedLines = lineMap.map(node => {
                        // 1. Spacing/Padding
                        if (node.isBlank) return node.prefix;

                        // 2. Fetch matched Rewrite
                        const rewrittenText = blockMap.get(node.id);
                        if (rewrittenText !== undefined) {
                            // Swap the LLM text strictly back behind the original Node.js Prefix (bullets, numbers, whitespace tabs)
                            return node.prefix + rewrittenText;
                        } else {
                            // 3. Fallback Engine
                            console.warn(`[Humanizer V8] Dropped AST block ${node.id} during LLM hallucination. Retaining original.`);
                            return node.prefix + node.core;
                        }
                    });

                    bestVariant = reconstructedLines.join('\n');
                } // end else (AST-BLOCK MODE)

                // ==========================================
                // NLP PIPELINE: Runs for BOTH modes
                // ==========================================
                // (formerly PHASE 5: V10 Server-Side Lockdown Pipeline)
                // ==========================================
                // V11 LAYER 2: Conjunction Purge — strip discourse markers from sentence starts
                bestVariant = applyConjunctionPurge(bestVariant);

                // V9 LAYER 3: Vocabulary Engine (cliché replacement, now 65+ phrases)
                bestVariant = applyVocabularyEngine(bestVariant, vibe as any);

                // V11 LAYER 4: IMF Approximation — perplexity spiking (40% predictable token replacement)
                bestVariant = applyIMFApproximation(bestVariant);

                // V10 LAYER 4b: Semantic Cloaking (Active/Passive Voice Reversal)
                bestVariant = applySemanticCloaking(bestVariant);

                // V11 LAYER 6: Sentence Starter Diversifier — humanize The/It/This starters
                bestVariant = applySentenceStarterDiversifier(bestVariant, vibe as any);

                // V9 LAYER 7: Burstiness Engine
                bestVariant = forceBurstiness(bestVariant);

                // V9 LAYER 8: Selective Token Masking / Human Flaws
                bestVariant = applyHumanFlaws(bestVariant, flawLevel as any);

                // V11 LAYER 9: Paragraph Rhythm Controller — inject single-line punch paragraphs
                bestVariant = applyParagraphRhythm(bestVariant);

                // V12 LAYER 10: Zipf Normalization — flatten over-represented mid-frequency words
                bestVariant = applyZipfNormalization(bestVariant);

                // V12 LAYER 11: Denominalization — convert noun chains to active verbs
                bestVariant = applyDenominalization(bestVariant);

                // V12 LAYER 12: Clause Reordering — move subordinate clauses to front position
                bestVariant = applyClauseReordering(bestVariant);

                // V12 LAYER 13: Deictic Injection — weave pronouns + spatial/temporal anchors
                bestVariant = applyDeicticInjection(bestVariant, vibe as any);

                // V12 LAYER 14: Semantic Drift — inject hedging bridge phrases for natural uncertainty
                bestVariant = applySemanticDrift(bestVariant, vibe as any);

                // V12.5 LAYER 14b: Human Pattern Injection — parenthetical asides + reaction fragments
                bestVariant = applyHumanPatterns(bestVariant, vibe as any);

                // V12 LAYER 15: Headless Verification Agent (7-metric In-House AI Detector, $0)
                report = runVerificationAgent(bestVariant);
                console.log(`[Humanizer V12 Detector] Score: ${report.humanScore}/100 | Passed: ${report.passed} | Failures: [${report.failures.join(', ')}]`);

                if (!report.passed) {
                    console.log(`[Humanizer V12 Auto-Heal] Triggered. Rewriting with structural variation + zero clichés...`);
                    const healingPrompt = `This text was flagged as AI-generated because its sentence structure is too uniform and predictable. COMPLETELY RESTRUCTURE it:

CRITICAL CHANGES NEEDED:
- Merge some sentences together with em-dashes or conjunctions
- Split at least 2 long sentences into short punchy ones (3-7 words)
- Start 2-3 sentences with "And", "But", "So", or "Still"
- Do NOT follow the original sentence order — rearrange how ideas are presented
- Mix very short paragraphs (1 sentence) with longer ones (3-4 sentences)
- Use at least one rhetorical question or short aside
- Zero AI discourse markers (no Furthermore, Moreover, Additionally, In conclusion)
- Keep the EXACT same meaning and facts — just restructure the architecture
- Word count must stay within ±10% of the original

Text to restructure:\n\n"${bestVariant}"`;

                    const healedRaw = await callGroq([
                        { role: "system", content: "You are an expert at making AI text undetectable. You understand that AI detection works by analyzing sentence structure patterns, not just vocabulary. Your weapon is STRUCTURAL CHAOS — mixing sentence lengths, merging/splitting ideas, changing presentation order — while preserving meaning perfectly." },
                        { role: "user", content: healingPrompt }
                    ], Math.min(0.95, targetTemp + 0.15), Math.min(0.98, targetTopP + 0.05), "llama-3.3-70b-versatile");

                    // Re-run the FULL V12 NLP pipeline on healed text
                    bestVariant = applyConjunctionPurge(healedRaw);
                    bestVariant = applyVocabularyEngine(bestVariant, vibe as any);
                    bestVariant = applyIMFApproximation(bestVariant);
                    bestVariant = applySemanticCloaking(bestVariant);
                    bestVariant = applySentenceStarterDiversifier(bestVariant, vibe as any);
                    bestVariant = forceBurstiness(bestVariant);
                    bestVariant = applyHumanFlaws(bestVariant, flawLevel as any);
                    bestVariant = applyParagraphRhythm(bestVariant);
                    bestVariant = applyZipfNormalization(bestVariant);
                    bestVariant = applyDenominalization(bestVariant);
                    bestVariant = applyClauseReordering(bestVariant);
                    bestVariant = applyDeicticInjection(bestVariant, vibe as any);
                    bestVariant = applySemanticDrift(bestVariant, vibe as any);
                    bestVariant = applyHumanPatterns(bestVariant, vibe as any);

                    // Re-verify after healing
                    const healedReport = runVerificationAgent(bestVariant);
                    console.log(`[Humanizer V12 Auto-Heal] Post-Heal Score: ${healedReport.humanScore}/100 | Passed: ${healedReport.passed}`);
                    report = healedReport;
                }

                console.log(`[Humanizer V12] 15-Layer Pipeline Complete. Score: ${report?.humanScore}/100`);

            } catch (e) {
                console.error("[Humanizer V12] Execution failed:", e);
                if (!bestVariant) bestVariant = prompt;
            }

            // Return response with verification report
            res.json({
                text: bestVariant,
                rateLimit: { remaining: "unlimited", isAuthenticated },
                verification: report
            });

        } catch (e: any) {
            console.error("Humanizer API crash:", e);
            res.status(500).json({ error: "Internal Server Error" });
        }
    });
}
