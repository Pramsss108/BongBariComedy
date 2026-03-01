import { Express } from "express";
import admin from "firebase-admin";
import { forceBurstiness, applyVocabularyEngine, applyHumanFlaws, computeBurstiness, computeCliche } from "../utils/nlp";

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

            // 2. Anti-Sharing Device Fingerprinting System
            // Binds an account strictly to the first device that uses it during the server lifecycle
            if (!userActiveDevices.has(authenticatedUid)) {
                userActiveDevices.set(authenticatedUid, deviceId);
            } else if (userActiveDevices.get(authenticatedUid) !== deviceId) {
                console.warn(`[Security Alert] Account sharing detected for UID ${authenticatedUid}. Binding mismatch.`);
                return res.status(403).json({ error: "Device Mismatch", message: "This premium account is currently bound to another device. Account sharing is strictly prohibited." });
            }

            // 3. Extract configuration
            const { prompt, vibe = 'casual', flawLevel = 'low', intensity = 'balanced' } = req.body || {};
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

            console.log(`[Humanizer V8-AST Mapping] Target: ${minWords}-${maxWords}w, Vibe: ${vibe}, Flaw: ${flawLevel}`);

            // ==========================================
            // PHASE 1: AST Tokenization (Mathematical Structure Mapping)
            // ==========================================
            const lines = prompt.split('\n');
            const lineMap: { id: number, prefix: string, core: string, isBlank: boolean }[] = [];
            let tokenizedPrompt = "";
            let blockId = 1;

            lines.forEach((line: string) => {
                const trimmed = line.trim();
                // If it's pure whitespace/empty, preserve exact spacing, don't ping LLM
                if (!trimmed) {
                    lineMap.push({ id: -1, prefix: line, core: "", isBlank: true });
                } else {
                    let prefix = "";
                    let coreText = line;

                    // Regex maps deep leading whitespace strings + bullet indicators (- * • > 1.)
                    const match = line.match(/^([ \t]*[*\-•>]\s*|[ \t]*\d+\.\s*|[ \t]+)/);
                    if (match) {
                        prefix = match[1];
                        coreText = line.substring(prefix.length);
                    }

                    lineMap.push({ id: blockId, prefix: prefix, core: coreText, isBlank: false });
                    tokenizedPrompt += `<block id="${blockId}">${coreText}</block>\n`;
                    blockId++;
                }
            });

            // ==========================================
            // PHASE 2: Independent Mathematical Vectors
            // ==========================================
            let temperature = 0.7; // Base temp

            let vibePrompt = "";
            if (vibe === 'genz') {
                temperature = 0.95;
                vibePrompt = "VIBE VECTOR: Gen-Z. Use extremely erratic conversational pacing. Occasionally use modern casual phrasing naturally (e.g., 'honestly,', 'not gonna lie'). Do NOT overdo slang. Lowercase some vocabulary unpredictably.";
            } else if (vibe === 'academic') {
                temperature = 0.40;
                vibePrompt = "VIBE VECTOR: Academic. Use highly precise, collegiate vocabulary and formal thesis structures. Zero contractions. Zero slang.";
            } else {
                temperature = 0.70;
                vibePrompt = "VIBE VECTOR: Casual. Write like a friendly peer on a professional forum. Unbuttoned but grammatically solid.";
            }

            let flawPrompt = "";
            if (flawLevel === 'high') {
                flawPrompt = "FLAW VECTOR: High. Intentionally insert 1-2 minor typographical errors (e.g. miss a comma, or use slightly awkward syntax) to mathematically mimic human phone-typing.";
            } else if (flawLevel === 'low') {
                flawPrompt = "FLAW VECTOR: Low. Use colloquial contractions freely. Slightly messy but mostly correct.";
            } else {
                flawPrompt = "FLAW VECTOR: Zero. Output grammatically perfect syntactical structures.";
            }

            // ==========================================
            // PHASE 3: The Master Prompt & AST Lock
            // ==========================================
            const buildV8Prompt = () => `You are the ultimate internal cognitive engine for bypassing AI detection. You are currently operating in V9 AST Tokenization Mode.

${vibePrompt}
${flawPrompt}

ABSOLUTE SYSTEM CONSTRAINTS:
1. AST REWRITE LOCK: You will receive text wrapped in <block id="X">...</block> tags. You MUST output your humanized response inside the exact same <block id="X">...</block> tags. 
2. NO BLOCK MERGING: Do not combine blocks. Do not omit any blocks. Do not add any blocks.
3. CONTEXTUAL AWARENESS: The blocks are contiguous parts of a single document. Keep the flow natural between them.
4. LENGTH LOCK: The total word count of your output must be between ${minWords} and ${maxWords} words. Do not summarize. Do not add intro/outro conversational filler like "Sure thing" or "Here is the rewritten text".
5. MEANING LOCK: Only use the exact facts provided in the original text.
6. V9 SELF-OUTPUT METHOD: For each block, internally generate 3 drastically different structural variations (differing sentence lengths, differing vocabulary). Select the one with the highest linguistic burstiness and the least predictable phrasing. Output ONLY the winning variation inside the <block> tag.
7. PERPLEXITY ENGINE: Swap highly robotic words (Crucial, Delve, Tapestry, Testament, Furthermore, Moreover, Elevate) for natural synonyms. Vary sentence lengths dramatically.

OUTPUT FORMAT MUST BE EXCLUSIVELY VALID XML BLOCKS.`;

            // ==========================================
            // PHASE 4: Execution & Deserialization
            // ==========================================
            const msgs = [
                { role: "system", content: buildV8Prompt() },
                { role: "user", content: `HUMANIZE THIS EXACT XML AST STRUCTURE OBEYING ALL FORMATTING LOCKS. OUTPUT ONLY XML:\n\n${tokenizedPrompt}` }
            ];

            let bestVariant = "";
            let targetTemp = 0.6;
            let targetTopP = 0.9;

            if (intensity === 'safe') { targetTemp = 0.3; targetTopP = 0.75; }
            if (intensity === 'wild') { targetTemp = 0.95; targetTopP = 0.98; }

            try {
                // Execute V9 AST Self-Output Prompt with V10 Typical Sampling Parameters
                const rawLLMOutput = await callGroq(msgs, targetTemp, targetTopP, "llama-3.3-70b-versatile");

                // AST XML Deserialization Map
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
                // ==========================================
                // PHASE 5: V10 Server-Side Lockdown Pipeline
                // ==========================================
                // V9 LAYER 3: Burstiness Engine
                bestVariant = forceBurstiness(bestVariant);

                // V9 LAYER 4: Vocabulary Engine
                bestVariant = applyVocabularyEngine(bestVariant, vibe as any);

                // V9 LAYER 5: Selective Token Masking / Human Flaws
                bestVariant = applyHumanFlaws(bestVariant, flawLevel as any);

                // V9 LAYER 6: Server-Side Agentic Verification Loop
                let b = computeBurstiness(bestVariant);
                let count = computeCliche(bestVariant).count;

                if (b < 15 || count > 3) {
                    console.log(`[Humanizer V10 Verification] Text failed metrics (B: ${b}, C: ${count}). Triggering Server-Side Auto-Heal...`);
                    const healingPrompt = `The previous text was flagged by AI detectors for being too robotic. Rewrite it again emphasizing dramatic sentence length variance and zero clichés:\n\n"${bestVariant}"`;

                    const healedRaw = await callGroq([
                        { role: "system", content: "You are an expert humanizer fixing robotic text." },
                        { role: "user", content: healingPrompt }
                    ], targetTemp, targetTopP, "llama-3.3-70b-versatile");

                    bestVariant = applyHumanFlaws(applyVocabularyEngine(forceBurstiness(healedRaw), vibe as any), flawLevel as any);
                    console.log(`[Humanizer V10 Verification] Auto-Heal Complete.`);
                }

                console.log(`[Humanizer V10] Finished Server-Side Cognitive Execution & Verification.`);

            } catch (e) {
                console.error("[Humanizer V10] Execution failed:", e);
                if (!bestVariant) bestVariant = prompt;
            }

            // Return response safely
            res.json({
                text: bestVariant,
                rateLimit: { remaining: "unlimited", isAuthenticated }
            });

        } catch (e: any) {
            console.error("Humanizer API crash:", e);
            res.status(500).json({ error: "Internal Server Error" });
        }
    });
}
