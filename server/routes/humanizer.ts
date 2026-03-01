import { Express } from "express";
import admin from "firebase-admin";
import { forceBurstiness, applyVocabularyEngine, applySemanticCloaking, applyHumanFlaws, applyConjunctionPurge, applyIMFApproximation, applySentenceStarterDiversifier, applyParagraphRhythm, computeBurstiness, computeCliche, runVerificationAgent } from "../utils/nlp";

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
                console.warn(`[Security Alert] Unauthenticated access attempt to V10 Cloud Pipeline from ${deviceId}`);
                return res.status(401).json({ error: "Unauthorized", message: "Authentication required to access the BongBari V10 Cloud Engine." });
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

            console.log(`[Humanizer V10] Mode: ${isSparse ? 'HOLISTIC (sparse input)' : 'AST-BLOCK (dense prose)'} | AvgLineWords: ${avgLineWords.toFixed(1)} | Target: ${minWords}-${maxWords}w`);

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
                temperature = 0.70;
                vibePrompt = "VIBE: Casual. Write like a thoughtful person explaining something to a friend. Contractions OK. Direct but not sloppy.";
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

            const buildHolisticPrompt = () => `You are a world-class human writing assistant. Rewrite the given text so it reads exactly like a real person wrote it — natural, varied, and undetectable by AI detectors.

${vibePrompt}
${flawPrompt}

RESEARCH-BACKED RULES:
1. BURSTINESS: Mix very short sentences (3–5 words) with long complex ones (25+ words). Never write three sentences of similar length in a row. Human CoV target: 56.95+.
2. NO AI OPENERS: Never start a sentence with Furthermore, Moreover, Additionally, In conclusion, It is worth noting, Therefore, Hence, Thus, In contrast, That being said.
3. HUMAN CONNECTORS: Use conversational transitions — "so", "and", "but", "honestly", "look", "here's the thing" — instead of formal discourse markers.
4. VOCABULARY VARIETY: Use unexpected, specific word choices. Avoid: delve, tapestry, seamlessly, holistic, robust, utilize, leverage, paradigm, ecosystem, game-changer, transformative.
5. ${bulletRule}
6. PRESERVE ALL CONTENT: Every idea, name, and term from the input must appear in the output. Do not drop anything.
7. LENGTH: Output word count should be close to input (within ±20%). Do not pad. Do not over-expand.
8. NO META-COMMENTARY: Output ONLY the rewritten content. No intro phrases like "Here is the rewritten text:".`;

            // AST-BLOCK MODE: For dense AI prose paragraphs
            const buildASTPrompt = () => `You are the V11 Chameleon Engine — the world's most advanced AI text humanizer. Operating in AST Tokenization Mode.

${vibePrompt}
${flawPrompt}

RESEARCH-BACKED ABSOLUTE CONSTRAINTS:
1. AST REWRITE LOCK: Text is wrapped in <block id="X">...</block> tags. Output MUST use the exact same <block id="X">...</block> tags with no merging or dropping.
2. BURSTINESS MANDATE: Human CoV target = 56.95. In every block, mix very short sentences (3–5 words) with long complex ones (25+ words). Never write uniform rhythm.
3. PERPLEXITY SPIKING: Choose unexpected, lower-probability word choices. Avoid the most obvious phrasing. Replace: Furthermore→(drop), Moreover→(drop), Additionally→(drop), crucial→key/central, delve→explore/look into, seamlessly→smoothly, holistic→complete, robust→strong, utilize→use.
4. CONJUNCTION PURGE: NEVER start a sentence with Furthermore, Moreover, Additionally, Therefore, Hence, Thus, In conclusion, That being said, Needless to say, Last but not least.
5. LENGTH LOCK: Total word count must be ${minWords}–${maxWords} words. No filler.
6. MEANING LOCK: Use only facts from the original text.
7. SELF-OUTPUT: For each block, generate 3 structural variations internally. Output only the most human-sounding one.

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
                bestVariant = applySentenceStarterDiversifier(bestVariant);

                // V9 LAYER 7: Burstiness Engine
                bestVariant = forceBurstiness(bestVariant);

                // V9 LAYER 8: Selective Token Masking / Human Flaws
                bestVariant = applyHumanFlaws(bestVariant, flawLevel as any);

                // V11 LAYER 9: Paragraph Rhythm Controller — inject single-line punch paragraphs
                bestVariant = applyParagraphRhythm(bestVariant);

                // V10 LAYER 10: Headless Verification Agent (In-House AI Detector, $0)
                report = runVerificationAgent(bestVariant);
                console.log(`[Humanizer V11 Detector] Score: ${report.humanScore}/100 | Passed: ${report.passed} | Failures: [${report.failures.join(', ')}]`);

                if (!report.passed) {
                    console.log(`[Humanizer V11 Auto-Heal] Triggered. Rewriting with aggressive burstiness + zero clichés...`);
                    const healingPrompt = `This text was flagged as AI-generated. Rewrite it with:
- Dramatic sentence length variation (mix 3-word punchy sentences with 30+ word complex ones)
- Zero AI discourse markers (no Furthermore, Moreover, Additionally, In conclusion)
- Conversational human connectors (honestly, look, so, and, but)
- Unexpected word choices instead of predictable ones\n\n"${bestVariant}"`;

                    const healedRaw = await callGroq([
                        { role: "system", content: "You are an expert at making AI text undetectable. You understand burstiness, perplexity, and human writing patterns at a mathematical level." },
                        { role: "user", content: healingPrompt }
                    ], Math.min(0.95, targetTemp + 0.15), Math.min(0.98, targetTopP + 0.05), "llama-3.3-70b-versatile");

                    // Re-run the FULL V11 NLP pipeline on healed text
                    bestVariant = applyConjunctionPurge(healedRaw);
                    bestVariant = applyVocabularyEngine(bestVariant, vibe as any);
                    bestVariant = applyIMFApproximation(bestVariant);
                    bestVariant = applySemanticCloaking(bestVariant);
                    bestVariant = applySentenceStarterDiversifier(bestVariant);
                    bestVariant = forceBurstiness(bestVariant);
                    bestVariant = applyHumanFlaws(bestVariant, flawLevel as any);
                    bestVariant = applyParagraphRhythm(bestVariant);

                    // Re-verify after healing
                    const healedReport = runVerificationAgent(bestVariant);
                    console.log(`[Humanizer V11 Auto-Heal] Post-Heal Score: ${healedReport.humanScore}/100 | Passed: ${healedReport.passed}`);
                    report = healedReport;
                }

                console.log(`[Humanizer V11] 10-Layer Pipeline Complete. Score: ${report?.humanScore}/100`);

            } catch (e) {
                console.error("[Humanizer V10] Execution failed:", e);
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
