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

// ─── HuggingFace Free ML Detector ──────────────────────────────────────────────
// Model: Hello-SimpleAI/chatgpt-detector-roberta
// Trained on real ChatGPT outputs — far more relevant than the old GPT-2 detector.
// Free tier: works without HF_TOKEN (rate-limited). Add HF_TOKEN env var for higher limits.
// Cold starts: first request can take 20-30s. Subsequent calls: ~1-2s.
// We apply a 5s timeout — if HF is cold/unavailable we skip gracefully (zero crash).
async function callHuggingFaceDetector(text: string): Promise<{ aiProb: number; humanProb: number; available: boolean }> {
    const HF_TOKEN = process.env.HF_TOKEN;
    const endpoint = "https://api-inference.huggingface.co/models/Hello-SimpleAI/chatgpt-detector-roberta";
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (HF_TOKEN) headers["Authorization"] = `Bearer ${HF_TOKEN}`;
        // RoBERTa tokenizer max is 512 tokens (~380 words). Slice to first 380 words for accuracy.
        const trimmedText = text.split(/\s+/).slice(0, 380).join(" ");
        const response = await fetch(endpoint, {
            method: "POST",
            headers,
            body: JSON.stringify({ inputs: trimmedText }),
            signal: controller.signal
        });
        clearTimeout(timeout);
        if (!response.ok) {
            // 503 = model loading (cold start), 429 = rate limited — both are transient, not errors
            console.warn(`[HF Detector] HTTP ${response.status} — skipping gracefully`);
            return { available: false, aiProb: 0, humanProb: 1 };
        }
        const data = await response.json();
        // Response format: [{ "label": "ChatGPT", "score": 0.94 }, { "label": "Human", "score": 0.06 }]
        if (!Array.isArray(data) || !data[0]?.label) {
            return { available: false, aiProb: 0, humanProb: 1 };
        }
        const aiEntry  = data.find((d: any) => d.label === "ChatGPT" || d.label === "AI");
        const humEntry = data.find((d: any) => d.label === "Human");
        const aiProb   = aiEntry?.score ?? (humEntry ? 1 - humEntry.score : 0.5);
        const humanProb = Math.round((1 - aiProb) * 1000) / 1000;
        console.log(`[HF Detector] AI: ${(aiProb * 100).toFixed(1)}% | Human: ${(humanProb * 100).toFixed(1)}%`);
        return { available: true, aiProb: Math.round(aiProb * 1000) / 1000, humanProb };
    } catch (e: any) {
        if (e.name === "AbortError") {
            console.warn("[HF Detector] 5s timeout — model cold starting or unavailable. Skipping.");
        } else {
            console.warn("[HF Detector] Error:", e.message);
        }
        return { available: false, aiProb: 0, humanProb: 1 };
    }
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
                // V13 PHRASE 10: Lowered from 0.95 — was forcing over-creative output that detectors caught
                temperature = 0.75;
                vibePrompt = "VIBE: Gen-Z. Conversational and natural. Occasional casual phrasing ('honestly,', 'not gonna lie'). No forced slang. Write like a real person texting a friend.";
            } else if (vibe === 'academic') {
                // V13 PHRASE 10: Lowered from 0.55 to 0.45 — conservative model writes cleaner formal prose
                temperature = 0.45;
                vibePrompt = "VIBE: Academic. Precise, collegiate vocabulary. Formal structure. Zero contractions. Zero slang.";
            } else {
                // V13 PHRASE 10: Lowered from 0.80 to 0.60 — 0.80 was too creative, caused fake-casual fingerprint
                // At 0.60 the model writes clean natural prose without forced gimmicks
                temperature = 0.60;
                vibePrompt = "VIBE: Casual. Natural, relaxed tone. Use contractions (it's, don't, can't, that's, they're, won't). Write like a competent human explaining something clearly.";
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
            // V13 PHRASE 12: Non-bullet fallback updated to match rule 3 (no 1-sentence paragraphs)
            const bulletRule = hasBullets
                ? `FORMATTING LOCK: The input contains bullet points or numbered lists. Your output MUST preserve the EXACT same format — if input uses "- item", output uses "- item". If input uses "1. item", output uses "1. item". Never convert bullets to prose sentences. Never drop the list markers.`
                : `PARAGRAPH STRUCTURE: Write in clear paragraphs of 2-4 sentences. Never create 1-sentence paragraphs for dramatic effect. Never write a paragraph longer than 5 sentences.`;

            // V13: Clean ghostwriter prompt — no gimmicks, no style theatre, no WRONG/RIGHT examples.
            // The old prompt taught the LLM to add em-dashes, rhetorical questions, fragments —
            // exactly what AI detectors flag. Now we just ask for clean natural prose.
            const buildHolisticPrompt = () => `You are a skilled human ghostwriter. Rewrite the following text so it reads like a real person wrote it naturally. Do not add stylistic gimmicks.

${vibePrompt}
${flawPrompt}

RULES:
1. MEANING LOCK: Keep every fact and idea from the original. Do not add, invent, or remove content.
2. NATURAL FLOW: Rewrite sentences in your own words. Vary sentence length organically — let the content dictate the rhythm, not a formula.
3. PARAGRAPH STRUCTURE: Write in clear paragraphs of 2-4 sentences each. Do not create dramatic 1-sentence paragraphs.
4. WORD COUNT: Stay within ±10% of the original word count (${minWords}–${maxWords} words).
5. NO AI FINGERPRINTS: Never start a sentence with Furthermore, Moreover, Additionally, Therefore, or In conclusion. Never use: delve, tapestry, seamlessly, holistic, robust, utilize, leverage, paradigm, multifaceted, comprehensive.
6. CONTRACTIONS: Use them naturally where they fit (it's, don't, can't, that's, they're, won't, isn't, doesn't).
7. ${bulletRule}
8. OUTPUT ONLY the rewritten text. No meta-commentary, no labels, no preamble.`;

            // AST-BLOCK MODE: For dense AI prose paragraphs
            // V13: Clean rewrite prompt — no gimmicks, no forced structure, no WRONG/RIGHT examples.
            const buildASTPrompt = () => `You are a skilled human ghostwriter in AST mode. Rewrite each XML block naturally — the way a real person would write it. Preserve all facts and meaning.

${vibePrompt}
${flawPrompt}

RULES:
1. MEANING LOCK: Keep every fact and idea from the original. Do not add, invent, or remove content.
2. NATURAL REWRITE: Rewrite each block's sentences in your own words. Vary sentence structure and length naturally — do not force fragments, em-dashes, or rhetorical questions.
3. WORD COUNT: Total output must be ${minWords}–${maxWords} words.
4. AST LOCK: Output MUST use the exact same <block id="X">...</block> tags. Never merge or drop blocks.
5. NO AI FINGERPRINTS: No Furthermore/Moreover/Additionally/Therefore/In conclusion. No delve/tapestry/seamlessly/holistic/robust.
6. CONTRACTIONS: Use naturally (it's, don't, can't, that's, they're, won't, isn't, doesn't).
7. OUTPUT: ONLY valid XML blocks. No commentary, no preamble.`;

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
            let hfDetectorResult: { aiProb: number; humanProb: number; available: boolean } = { available: false, aiProb: 0, humanProb: 1 };
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

                // V13 PHRASE 19: Save raw LLM output BEFORE NLP layers run.
                // Used as fallback if NLP causes >15% word count drift (meaning distortion).
                const prePipelineVariant = bestVariant;
                const prePipelineWordCount = bestVariant.trim().split(/\s+/).length;

                // ==========================================
                // V13 NLP PIPELINE: Reduced from 15 layers to 5 essential layers.
                // REASON: Over-processing stacked compound fingerprints detected by Originality.ai.
                // Each disabled layer made output MORE detectable, not less.
                // PROVEN: 100% AI score on V12.5 → target <40% on V13.
                // ==========================================

                // LAYER 1 (KEEP): Conjunction Purge — strips AI discourse markers (Furthermore, Moreover...)
                bestVariant = applyConjunctionPurge(bestVariant);

                // LAYER 2 (KEEP): Vocabulary Engine — replaces top AI cliché words only
                bestVariant = applyVocabularyEngine(bestVariant, vibe as any);

                // LAYER 3 (DISABLED — V13): IMF over-replaces tokens, corrupts grammar ("result in curd" bug)
                // bestVariant = applyIMFApproximation(bestVariant);

                // LAYER 4 (KEEP): Semantic Cloaking — subtle active/passive flip on ~30% of sentences
                bestVariant = applySemanticCloaking(bestVariant);

                // LAYER 5 (DISABLED — V13): Sentence Starter Diversifier — mechanical "Still," prepends are detector-flagged
                // bestVariant = applySentenceStarterDiversifier(bestVariant, vibe as any);

                // LAYER 6 (DISABLED — V13): Burstiness Engine — em-dash spam is a known AI-humanizer signature
                // bestVariant = forceBurstiness(bestVariant);

                // LAYER 7 (KEEP): Human Flaws — contractions + minor natural imperfections
                bestVariant = applyHumanFlaws(bestVariant, flawLevel as any);

                // V13 PHRASE 19: Post-pipeline word count drift guard.
                // If NLP layers inflated or deflated word count by >15%, revert to clean LLM output.
                // Human ghostwriters don't balloon or shrink text — NLP layers shouldn't either.
                const postPipelineWordCount = bestVariant.trim().split(/\s+/).length;
                if (Math.abs(postPipelineWordCount - prePipelineWordCount) / Math.max(1, prePipelineWordCount) > 0.15) {
                    console.log(`[Humanizer V13] NLP word drift exceeded 15% (${prePipelineWordCount}→${postPipelineWordCount}w). Reverting to pre-NLP output.`);
                    bestVariant = prePipelineVariant;
                }

                // LAYER 8 (DISABLED — V13): Paragraph Rhythm — artificial 1-sentence paragraphs spike burstiness unnaturally
                // bestVariant = applyParagraphRhythm(bestVariant);

                // LAYER 9 (DISABLED — V13): Zipf Normalization — creates odd word substitutions
                // bestVariant = applyZipfNormalization(bestVariant);

                // LAYER 10 (DISABLED — V13): Denominalization — flips nouns to verbs, causes grammatical artifacts
                // bestVariant = applyDenominalization(bestVariant);

                // LAYER 11 (DISABLED — V13): Clause Reordering — "because" fronting creates awkward sentence starts
                // bestVariant = applyClauseReordering(bestVariant);

                // LAYER 12 (DISABLED — V13): Deictic Injection — mechanical pronoun insertion
                // bestVariant = applyDeicticInjection(bestVariant, vibe as any);

                // LAYER 13 (DISABLED — V13): Semantic Drift — hedging filler adds no semantic value
                // bestVariant = applySemanticDrift(bestVariant, vibe as any);

                // LAYER 14 (DISABLED — V13): Human Pattern Injection — forced "(no surprise there)" fillers are detected
                // bestVariant = applyHumanPatterns(bestVariant, vibe as any);

                // LAYER 15 (KEEP): Verification Agent — internal 7-metric detector score
                report = runVerificationAgent(bestVariant);
                console.log(`[Humanizer V13 Detector] Score: ${report.humanScore}/100 | Passed: ${report.passed} | Failures: [${report.failures.join(', ')}]`);

                // V13 PHRASE 18: Dual-model healing loop — up to 2 attempts, zero extra cost.
                // SCIENCE: Different LLM architectures produce different statistical writing fingerprints.
                // Attempt 1: llama-3.3-70b (Groq free) — lower temp, conservative simplification.
                // Attempt 2: gemma2-9b-it (Groq free, Google DeepMind architecture) — completely different
                //   n-gram distributions and perplexity curves than llama. Breaks llama's fingerprint.
                // Result: If llama output is detected, gemma produces structurally different prose
                //   that real detectors' training data won't pattern-match as easily.
                let healAttempt = 0;
                while (!report.passed && healAttempt < 2) {
                    healAttempt++;
                    const healModel = healAttempt === 1 ? "llama-3.3-70b-versatile" : "gemma2-9b-it";
                    const healTemp  = healAttempt === 1 ? 0.55 : 0.50;
                    const healTopP  = healAttempt === 1 ? 0.85 : 0.80;
                    console.log(`[Humanizer V13 Auto-Heal] Attempt ${healAttempt}/2 — model: ${healModel} | temp: ${healTemp}`);

                    const healingPrompt = `This text reads like it was written by AI. Simplify it. Rewrite it the way a real person would naturally write it — without any gimmicks.

GUIDELINES:
- Use straightforward, clear sentences
- Vary sentence length naturally based on what sounds right — do not force short punchy sentences
- Remove any rhetorical devices, em-dash asides, or forced fragments
- Keep every fact and idea from the original — do not add or remove content
- Use contractions where they fit naturally
- No AI discourse markers (no Furthermore, Moreover, Additionally, In conclusion)
- Word count must stay within ±10% of the original

Text to rewrite:\n\n"${bestVariant}"`;

                    const healedRaw = await callGroq([
                        { role: "system", content: "You are a skilled human writer. Rewrite AI-generated text so it reads naturally — like a real person wrote it. Clean, clear, honest prose. No gimmicks." },
                        { role: "user", content: healingPrompt }
                    ], healTemp, healTopP, healModel);

                    // Re-run the REDUCED 5-layer pipeline on healed text
                    bestVariant = applyConjunctionPurge(healedRaw);
                    bestVariant = applyVocabularyEngine(bestVariant, vibe as any);
                    bestVariant = applySemanticCloaking(bestVariant);
                    bestVariant = applyHumanFlaws(bestVariant, flawLevel as any);

                    const healedReport = runVerificationAgent(bestVariant);
                    console.log(`[Humanizer V13 Auto-Heal] Attempt ${healAttempt} → score: ${healedReport.humanScore}/100 | passed: ${healedReport.passed}`);
                    report = healedReport;
                }

                // ── HuggingFace Real ML Detector ──────────────────────────────────────────
                // Calls Hello-SimpleAI/chatgpt-detector-roberta via HF Inference API (free).
                // This is a REAL ML model trained on ChatGPT outputs — supplements our math scoring.
                // If HF says AI prob > 65%, override passed = false so the UI shows amber warning.
                // If HF is unavailable (cold start / rate limit), falls back to math score only.
                hfDetectorResult = await callHuggingFaceDetector(bestVariant);
                if (hfDetectorResult.available && hfDetectorResult.aiProb > 0.65 && report?.passed) {
                    console.log(`[HF Detector] Overriding math PASS → FAIL (AI prob: ${(hfDetectorResult.aiProb * 100).toFixed(1)}% > 65% threshold)`);
                    report = { ...report, passed: false };
                }

                console.log(`[Humanizer V13] 5-Layer Pipeline Complete. Score: ${report?.humanScore}/100 | HF AI prob: ${hfDetectorResult.available ? (hfDetectorResult.aiProb * 100).toFixed(1) + '%' : 'N/A (model cold)'}`);

            } catch (e) {
                console.error("[Humanizer V12] Execution failed:", e);
                if (!bestVariant) bestVariant = prompt;
            }

            // Return response with verification report
            res.json({
                text: bestVariant,
                rateLimit: { remaining: "unlimited", isAuthenticated },
                verification: report,
                hfDetector: hfDetectorResult
            });

        } catch (e: any) {
            console.error("Humanizer API crash:", e);
            res.status(500).json({ error: "Internal Server Error" });
        }
    });
}
