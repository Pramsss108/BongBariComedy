import { Express } from "express";
import admin from "firebase-admin";

export function registerHumanizerRoutes(app: Express, sessions: Map<string, any>, getDeviceIdFromReq: Function) {
    // Basic rate limit map (memory only - suitable since we only have one instance)
    const humanizerRateLimit = new Map<string, { count: number, resetTime: number }>();

    function checkLimit(deviceId: string, isAuthenticated: boolean) {
        if (isAuthenticated) return { allowed: true, remaining: -1 }; // Unlimited for logged in

        const now = Date.now();
        const dailyResetTime = new Date().setHours(24, 0, 0, 0); // Reset at midnight
        let userLimit = humanizerRateLimit.get(deviceId);

        if (!userLimit || now >= userLimit.resetTime) {
            userLimit = { count: 0, resetTime: dailyResetTime };
            humanizerRateLimit.set(deviceId, userLimit);
        }

        const max = 50; // 50 phrase generations per day for anon users
        if (userLimit.count >= max) return { allowed: false, remaining: 0 };
        return { allowed: true, remaining: max - userLimit.count - 1 };
    }

    app.post("/api/humanize/groq", async (req, res) => {
        try {
            const deviceId = getDeviceIdFromReq(req);
            let isAuthenticated = false;

            // Check for Firebase Auth Token
            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.startsWith('Bearer ')) {
                const idToken = authHeader.split('Bearer ')[1].trim();
                try {
                    // Try to verify the Firebase token
                    if (admin.apps.length > 0) {
                        await admin.auth().verifyIdToken(idToken);
                        isAuthenticated = true; // JWT is valid! Give unlimited access!
                    }
                } catch (err) {
                    console.error("Invalid Firebase token presented to Humanizer.");
                }
            }

            // 1. Rate Limiting Check
            const limit = checkLimit(deviceId, isAuthenticated);
            if (!limit.allowed) {
                return res.status(429).json({ error: "Limit reached", message: "Sign up to unlock unlimited Groq Power!" });
            }

            // 2. Extract configuration
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
            } catch (e) {
                console.error("[Humanizer V8] Execution failed:", e);
                bestVariant = prompt;
            }

            console.log(`[Humanizer V8] Finished AST cognitive execution.`);

            // Update Rate Limit usage
            if (!isAuthenticated) {
                const ul = humanizerRateLimit.get(deviceId);
                if (ul) ul.count++;
            }

            // Return response safely
            res.json({
                text: bestVariant,
                rateLimit: { remaining: limit.remaining, isAuthenticated }
            });

        } catch (e: any) {
            console.error("Humanizer API crash:", e);
            res.status(500).json({ error: "Internal Server Error" });
        }
    });
}
