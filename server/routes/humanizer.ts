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

            console.log(`[Humanizer] Starting 3-Stage Pipeline. Vibe: ${vibe}, Flaw: ${flawLevel}`);

            // ==========================================
            // PRE-STAGE: Analytics
            // ==========================================
            const wordCount = prompt.trim().split(/\s+/).length;
            const minWords = Math.max(10, Math.floor(wordCount * 0.85)); // Allow 15% reduction
            const maxWords = Math.floor(wordCount * 1.15); // Allow 15% expansion

            console.log(`[Humanizer] Starting 3-Stage Pipeline. Vibe: ${vibe}, Flaw: ${flawLevel}. Target words: ${minWords}-${maxWords}`);

            // ==========================================
            // STAGE 1: Semantic Deconstruction
            // ==========================================
            const stage1Messages = [
                { role: "system", content: "You are an expert semantic analyzer. Extract the core meaning, arguments, and facts from the following text into a condensed bulleted list. Strip away all transitional phrases, complex grammar, and AI-like formatting. Output ONLY the raw facts/points." },
                { role: "user", content: prompt }
            ];
            const bulletPoints = await callGroq(stage1Messages, 0.2);

            // ==========================================
            // STAGE 2: Persona Drafter (High Perplexity/Burstiness)
            // ==========================================
            const stage2Messages = [
                {
                    role: "system", content: `You are a creative writer. Your ONLY job is to take the provided bullet points and write a continuous, engaging text. 
CRITICAL RULES:
1. STRICT LENGTH CONSTRAINT: You MUST write exactly between ${minWords} and ${maxWords} words. Do not exceed this limit under any circumstances.
2. NO HALLUCINATION: DO NOT invent new examples, names, or applications. ONLY use the facts provided in the bullet points.
3. EXTREME BURSTINESS: You MUST mix brutally short sentences (2-4 words) with very long, meandering sentences. Let your thoughts wander slightly.
4. NO AI WORDS: Do not use "Furthermore", "In conclusion", "It is important to note", "Delve", "Tapestry", "Crucial", "Underscores", "Testament".
5. NO LISTS: Write as fluid paragraphs. Never use bullet points or numbered lists.
6. NO SUMMARY: Never summarize at the end. End abruptly if needed.` },
                { role: "user", content: `Here are the points to expand on:\n\n${bulletPoints}` }
            ];
            const draft = await callGroq(stage2Messages, 0.85);

            // ==========================================
            // STAGE 3: The "Flaw & Vibe" Injector
            // ==========================================
            let vibePrompt = "";
            if (vibe === 'academic') vibePrompt = "Tone: Academic and Professional. Use sophisticated but accessible vocabulary. Avoid internet slang, but keep the sentence structure engaging and slightly conversational to bypass computational detectors.";
            else if (vibe === 'genz') vibePrompt = "Tone: Gen-Z / Modern Internet Native. Use modern internet slang naturally (e.g., lowkey, honestly, vibing, totally, NGL, unhinged, era, literal). Do not overdo it. Write like a highly upvoted Reddit comment or Twitter thread.";
            else vibePrompt = "Tone: Casual and Relatable. Write like a friendly blogger or a conversational email to a friend. Warm, accessible, and strongly opinionated.";

            let flawPrompt = "";
            if (flawLevel === 'high') flawPrompt = "Human Imperfections (HIGH): Deliberately include 1-2 minor typos or grammatical shortcuts. Examples: occasionally use lowercase 'i', use 'kinda' or 'gonna', start sentences with 'And' or 'But', and use comma splices. Make it look like a fast, messy first draft typed on a phone.";
            else if (flawLevel === 'low') flawPrompt = "Human Imperfections (LOW): Write conversationally. It is okay to start sentences with conjunctions ('And', 'But'). Use contractions heavily (they're, it's). Keep grammar generally correct but relaxed.";
            else flawPrompt = "Human Imperfections (NONE): Keep perfect grammar and spelling, but absolutely maintain the requested human tone and burstiness.";

            const stage3Messages = [
                {
                    role: "system", content: `You are the final humanizing editor. Your job is to take the provided draft and inject a specific persona and human imperfections to ensure it passes as 100% human-written.
                
${vibePrompt}
${flawPrompt}

CRITICAL RULES: 
1. LENGTH CONSTRAINT: Your output must be between ${minWords} and ${maxWords} words to match the original text length. Cut fluff if needed.
2. NO HALLUCINATION: DO NOT ADD NEW FACTS, EXAMPLES, OR METAPHORS.
3. Output ONLY the final text. Do not add any introductory or concluding remarks. Do not use quotes around the text. Preserve the original meaning completely.` },
                { role: "user", content: `Draft to humanize:\n\n${draft}` }
            ];

            // Use faster 8B model for final pass
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
