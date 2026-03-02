import { Express } from "express";
import admin from "firebase-admin";
import { forceBurstiness, applyVocabularyEngine, applySemanticCloaking, applyHumanFlaws, applyConjunctionPurge, applyIMFApproximation, applySentenceStarterDiversifier, applyParagraphRhythm, applyDeicticInjection, applyDenominalization, applyClauseReordering, applySemanticDrift, applyZipfNormalization, computeBurstiness, computeCliche, runVerificationAgent } from "../utils/nlp";

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
                temperature = 0.40;
                vibePrompt = "VIBE: Academic. Precise, collegiate vocabulary. Formal structure. Zero contractions. Zero slang.";
            } else {
                temperature = 0.55;
                vibePrompt = "VIBE: Casual. Light, natural tone — like a well-written blog post. Contractions OK. Direct but not sloppy. Do NOT inject opinions or personal commentary.";
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

            const buildHolisticPrompt = () => `You are a world-class human writing assistant. Rewrite the given text so it reads naturally — like a real person wrote it — while preserving the original meaning exactly.

${vibePrompt}
${flawPrompt}

ABSOLUTE RULES (ranked by priority):
1. MEANING LOCK (CRITICAL): Rewrite using ONLY facts and ideas explicitly stated in the input. NEVER add new examples, topics, statistics, opinions, or concepts not present in the original text. If the input mentions "ethical concerns" generically, do NOT expand with specific examples like "job displacement" or "privacy issues" unless the original explicitly names them. If the input is objective, the output MUST be objective.
2. WORD COUNT LOCK: Output word count MUST be within ±10% of input word count. Count carefully. No padding, no filler phrases, no unnecessary expansion. If input is 60 words, output must be 54–66 words.
3. TONE PRESERVATION: Match the input's register exactly. If input is formal/neutral, output must be formal/neutral with light humanization only. Do NOT inject conversational asides or chatty filler into formal text.
4. DISCOURSE MARKER LIMIT: Use AT MOST 1 casual opener (like "Look," or "Honestly,") per 3 paragraphs. Never stack multiple discourse markers. Never use "you know", "let's be real", "not gonna lie" in formal/neutral text.
5. STRUCTURE PRESERVATION: Keep the same logical flow — same idea ordering, same paragraph structure. Do not rearrange, loop back, or repeat ideas.
6. BURSTINESS: Slightly vary sentence lengths. Mix shorter sentences with longer ones naturally. Do NOT force extreme 3-word punchy sentences.
7. NO AI OPENERS: Never start a sentence with Furthermore, Moreover, Additionally, In conclusion, It is worth noting, Therefore, Hence, Thus, In contrast, That being said.
8. VOCABULARY: Replace obvious AI cliché words (delve, tapestry, seamlessly, holistic, robust, utilize, leverage, paradigm, ecosystem, game-changer, transformative) with natural alternatives.
9. ${bulletRule}
10. PRESERVE ALL CONTENT: Every idea, name, and key term from the input must appear in the output. Do not drop anything.
11. NATURAL CONTRACTIONS: Use contractions naturally (it's, don't, can't, we're) but do not over-casualize formal text.
12. DE-NOMINALIZE: Replace stiff nominalizations like "the implementation of X" with active verbal forms like "implementing X". Write with verbs, not noun chains.
13. NO FILLER: Never add filler phrases like "more or less", "at least in most cases", "generally speaking", "to some degree", "you know". Every word must carry meaning.
14. NO META-COMMENTARY: Output ONLY the rewritten content. No intro phrases.`;

            // AST-BLOCK MODE: For dense AI prose paragraphs
            const buildASTPrompt = () => `You are a precise AI text humanizer operating in AST Tokenization Mode.

${vibePrompt}
${flawPrompt}

ABSOLUTE CONSTRAINTS (ranked by priority):
1. MEANING LOCK (CRITICAL): Rewrite using ONLY facts explicitly stated in the original text. NEVER add new examples, topics, statistics, opinions, or concepts not present in the original. If input is objective, output must be objective.
2. WORD COUNT LOCK: Total word count MUST be ${minWords}–${maxWords} words. Count carefully. No filler. No padding. No expansion.
3. TONE PRESERVATION: Match the input's register exactly. Formal input = formal output. Neutral input = neutral output.
4. AST REWRITE LOCK: Text is wrapped in <block id="X">...</block> tags. Output MUST use the exact same <block id="X">...</block> tags with no merging or dropping.
5. BURSTINESS: Slightly vary sentence lengths within each block. Do NOT force extreme punchy sentences — keep variation natural.
6. VOCABULARY: Replace AI cliché words (delve, tapestry, seamlessly, holistic, robust, utilize, leverage) with natural alternatives.
7. CONJUNCTION PURGE: NEVER start a sentence with Furthermore, Moreover, Additionally, Therefore, Hence, Thus, In conclusion, That being said.
8. DISCOURSE MARKER LIMIT: Use AT MOST 1 casual opener per 3 paragraphs. Never stack "Honestly", "Look", "you know" etc.
9. STRUCTURE PRESERVATION: Keep the same logical flow within each block. Same idea ordering. No looping or repeating.
10. NATURAL CONTRACTIONS: Use contractions naturally but do not over-casualize formal text.
11. DE-NOMINALIZE: Convert noun-heavy constructions into active verbal forms. Verbs over nouns.
12. NO FILLER: Never add filler like "more or less", "generally speaking", "you know". Every word must carry meaning.

OUTPUT FORMAT: EXCLUSIVELY valid XML blocks.`;

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

                // V12 LAYER 15: Headless Verification Agent (7-metric In-House AI Detector, $0)
                report = runVerificationAgent(bestVariant);
                console.log(`[Humanizer V12 Detector] Score: ${report.humanScore}/100 | Passed: ${report.passed} | Failures: [${report.failures.join(', ')}]`);

                if (!report.passed) {
                    console.log(`[Humanizer V12 Auto-Heal] Triggered. Rewriting with aggressive burstiness + zero clichés...`);
                    const healingPrompt = `This text was flagged as AI-generated. Rewrite it with:
- Dramatic sentence length variation (mix 3-word punchy sentences with 30+ word complex ones)
- Zero AI discourse markers (no Furthermore, Moreover, Additionally, In conclusion)
- Conversational human connectors (honestly, look, so, and, but)
- Unexpected word choices instead of predictable ones\n\n"${bestVariant}"`;

                    const healedRaw = await callGroq([
                        { role: "system", content: "You are an expert at making AI text undetectable. You understand burstiness, perplexity, and human writing patterns at a mathematical level." },
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
