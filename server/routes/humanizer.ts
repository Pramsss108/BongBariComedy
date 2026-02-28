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
            const { prompt, vibe = 'casual', flawLevel = 'low' } = req.body || {};
            if (!prompt) {
                return res.status(400).json({ error: "Prompt is required" });
            }

            // 3. Environment Variable Security Check
            const apiKey = process.env.GROQ_API_KEY;
            if (!apiKey) {
                return res.status(500).json({ error: "Server Configuration Error", message: "Groq API key not configured on server" });
            }

            // Helper for fast internal API calls to Groq
            const callGroq = async (messages: any[], temperature: number, model: string = "llama-3.3-70b-versatile") => {
                const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${apiKey}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ model, messages, temperature, max_tokens: 4096 })
                });
                if (!groqRes.ok) {
                    const errText = await groqRes.text();
                    console.error("Groq Checkpoint Error:", errText);
                    throw new Error("Groq API Failure");
                }
                const data = await groqRes.json();
                return data.choices?.[0]?.message?.content?.trim() || "";
            }

            // Word count bounds (calculated first, used throughout the pipeline)
            const wordCount = prompt.trim().split(/\s+/).length;
            const minWords = Math.max(10, Math.floor(wordCount * 0.85));
            const maxWords = Math.floor(wordCount * 1.15);

            console.log(`[Humanizer v2] Starting Cognitive Simulation Pipeline. Vibe: ${vibe}, Flaw: ${flawLevel}. Target: ${minWords}-${maxWords}w`);

            // ==========================================
            // STAGE 0: Cognitive Decoder (NEW v2)
            // Extract tone intent, emphasis, and narrative — not just facts.
            // This is what stops it from being a "data rewrite" instead of a "thought rewrite".
            // ==========================================
            const stage0Messages = [
                {
                    role: "system",
                    content: `You are a meta-analyst. Read the following text and output a JSON object with exactly these three fields:
- "intent": One of: "persuading", "warning", "explaining", "questioning", "observing". What is the author trying to make the reader feel?
- "emphasis": The single most important idea or claim in the text (one short sentence, the "load-bearing" point).
- "narrative": One of: "building_to_conclusion", "opening_a_question", "stating_a_fact", "arguing". What direction is the author pulling the reader?

Output ONLY valid JSON. No markdown, no explanation, no code block.`
                },
                { role: "user", content: prompt }
            ];
            let cognitive = { intent: "explaining", emphasis: "", narrative: "stating_a_fact" };
            try {
                const cogRaw = await callGroq(stage0Messages, 0.1);
                cognitive = JSON.parse(cogRaw);
            } catch { /* keep defaults if parse fails */ }

            // ==========================================
            // STAGE 1: Semantic Deconstruction
            // Use cognitive context to tag which bullets are "load-bearing" vs "supporting"
            // ==========================================
            const stage1Messages = [
                {
                    role: "system",
                    content: `You are a semantic analyst. Extract facts from the text as bulleted points.
IMPORTANT: The author's key emphasis is: "${cognitive.emphasis || 'the main point'}"
Mark the most important bullet with [KEY] prefix. Mark supporting details with [SUP] prefix.
Output ONLY the bulleted list. No explanations.`
                },
                { role: "user", content: prompt }
            ];
            const bulletPoints = await callGroq(stage1Messages, 0.2);

            // ==========================================
            // STAGE 2: Cognitive Drafter — Opinion Spine + Micro-Contradictions + Imperfect Compression
            // This is the core of v2. Shifting from linguistic tricks → cognitive simulation.
            // ==========================================
            const narrativeInstruction =
                cognitive.narrative === "building_to_conclusion" ? "Build momentum as you write. The final sentence should feel like a natural landing." :
                    cognitive.narrative === "opening_a_question" ? "End with a thought that leaves something unresolved — don't tie it up perfectly." :
                        cognitive.narrative === "arguing" ? "Take a clear position. Don't be neutral." :
                            "Present the idea as if discovering it while writing.";

            const intentInstruction =
                cognitive.intent === "warning" ? "The author is cautious. Let that skepticism bleed through subtly." :
                    cognitive.intent === "persuading" ? "The author wants the reader convinced. Have a point of view." :
                        cognitive.intent === "questioning" ? "Hold some uncertainty. You don't have all the answers." :
                            "Be direct and slightly opinionated, like someone who has thought about this before.";

            const stage2Messages = [
                {
                    role: "system",
                    content: `You are a human writer reconstructing an argument from notes. Your output must read like a real person thinking through an idea, not reciting information.

COGNITIVE RULES (most important):
1. OPINION SPINE: You have a perspective on this. Lean into it subtly — imply judgment without stating "I think". The reader should sense your position.
2. MICRO-CONTRADICTIONS: After making a strong claim, soften or complicate it in the next sentence. Humans rarely state anything with 100% certainty. e.g. "it's genuinely impressive... though maybe also a bit unsettling."
3. IMPERFECT COMPRESSION: The [KEY] bullet gets more words and attention. The [SUP] bullets can be compressed abruptly or mentioned in passing. Do NOT distribute attention evenly — that's an AI trait.
4. SEMANTIC RHYTHM: Let sentence length follow thought. Write short when certain. Write long when exploring or qualifying. Do NOT use mathematical patterns.

STYLE RULES:
5. NO HALLUCINATION: Only use facts from the provided notes. Zero new examples.
6. LENGTH: Write between ${minWords} and ${maxWords} words total.
7. NO AI WORDS: Ban: "Furthermore", "In conclusion", "It is important to note", "Delve", "Tapestry", "Crucial", "Underscores", "Moreover", "Testament", "Notably".
8. NO LISTS: Fluid prose only.

NARRATIVE DIRECTION: ${narrativeInstruction}
INTENT: ${intentInstruction}`
                },
                { role: "user", content: `Reconstruct this from notes:\n\n${bulletPoints}` }
            ];
            const draft = await callGroq(stage2Messages, 0.88);

            // ==========================================
            // STAGE 3: Restrained Vibe & Context-Aware Imperfections
            // v2 fix: inject vibe ONCE where natural, not throughout the text
            // ==========================================
            let vibePrompt = "";
            if (vibe === 'academic') {
                vibePrompt = `Tone adjustment: Academic and precise. If there is a place where a sophisticated but slightly informal turn of phrase would fit naturally, use it ONCE. Do not force this. The text should feel like a knowledgeable person speaking without jargon.`;
            } else if (vibe === 'genz') {
                vibePrompt = `Tone adjustment: Find ONE place — and only one — where a modern casual expression would land completely naturally (e.g., "which is wild", "honestly kind of impressive", "that tracks"). Do not add slang everywhere. If nowhere feels natural, do not add it at all.`;
            } else {
                vibePrompt = `Tone adjustment: Casual and direct. Write like someone with an informed opinion explaining something to a friend. One moment of warmth or human admission is fine — but do not overdo it.`;
            }

            let flawPrompt = "";
            if (flawLevel === 'high') {
                flawPrompt = `Imperfections: The writer is smart but typing quickly. One slight grammatical shortcut is fine — a conjunction starting a sentence, a contraction, one comma splice. These should feel natural to the moment, not sprinkled randomly.`;
            } else if (flawLevel === 'low') {
                flawPrompt = `Imperfections: Use contractions freely (they're, it's, wasn't). It's fine to start one sentence with "And" or "But". Otherwise, keep grammar clean.`;
            } else {
                flawPrompt = `Imperfections: Keep grammar clean. The human quality comes from cognitive framing, not surface errors.`;
            }

            const stage3Messages = [
                {
                    role: "system",
                    content: `You are the final editor. Make minimal, targeted adjustments to the draft below.

${vibePrompt}
${flawPrompt}

CRITICAL: 
1. LENGTH CONSTRAINT: Keep between ${minWords} and ${maxWords} words. Don't add new ideas.
2. NO HALLUCINATION: Do not add new facts, examples, or metaphors.
3. Preserve the opinion spine and micro-contradictions from the draft. Do NOT smooth them out.
4. Output ONLY the final text. No labels, no preamble, no quotes.`
                },
                { role: "user", content: `Draft:\n\n${draft}` }
            ];

            // Use faster 8B model for Stage 3 final polish
            const rewrittenText = await callGroq(stage3Messages, 0.75, "llama-3.1-8b-instant");


            // 5. Update Rate Limit usage
            if (!isAuthenticated) {
                const ul = humanizerRateLimit.get(deviceId);
                if (ul) ul.count++;
            }

            // 6. Return response safely
            res.json({
                text: rewrittenText,
                rateLimit: { remaining: limit.remaining, isAuthenticated }
            });

        } catch (e: any) {
            console.error("Humanizer API crash:", e);
            res.status(500).json({ error: "Internal Server Error" });
        }
    });
}
