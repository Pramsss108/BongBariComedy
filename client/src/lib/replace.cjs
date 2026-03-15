const fs = require('fs');
let content = fs.readFileSync('client/src/lib/bengali-tts-engine.ts', 'utf-8');

const replacement = `const MMS_SPACES = [
    "https://dpc-mmstts.hf.space",
    "https://facebook-mms-tts.hf.space"
];

// Optional Cloudflare Worker Proxy URL
const CF_PROXY_URL = import.meta.env.VITE_CF_TTS_PROXY || null;

/**
 * Generate Bengali speech using Meta MMS TTS.
 * Fallback architecture:
 * 1. Tries Cloudflare Worker Proxy (if configured)
 * 2. Rotates through available Gradio Spaces directly
 */
export async function generateWithMMS(text: string): Promise<ArrayBuffer> {
    // 1. Try CF Proxy first if available
    if (CF_PROXY_URL) {
        try {
            const res = await fetch(CF_PROXY_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text })
            });
            if (res.ok) {
                return await res.arrayBuffer();
            }
            console.warn("CF Proxy failed, falling back to direct Space rotation...");
        } catch (e) {
            console.warn("CF Proxy error:", e);
        }
    }

    // 2. Client-side rotation over Hugging Face Spaces
    let lastError = null;
    
    for (const spaceUrl of MMS_SPACES) {
        try {
            console.log(\`Trying MMS space: \${spaceUrl}\`);
            const res = await fetch(\`\${spaceUrl}/api/predict\`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ data: [text, "Bengali (ben)"] }),
            });

            if (!res.ok) continue;

            const json = await res.json();
            if (json.data?.[0]?.name) {
                const audioRes = await fetch(\`\${spaceUrl}/file=\${json.data[0].name}\`);
                if (!audioRes.ok) continue;
                return await audioRes.arrayBuffer();
            }
        } catch (e) {
            lastError = e;
            console.warn(\`Space \${spaceUrl} failed:\`, e);
            continue; // Move to next space on failure
        }
    }

    throw new Error(\`All MMS fallbacks exhausted. Last error: \${lastError?.toString()}\`);
}`;

content = content.replace(/const MMS_SPACE_URL = [\s\S]*?throw new Error\("Unexpected MMS response format"\);\n\}/, replacement);

fs.writeFileSync('client/src/lib/bengali-tts-engine.ts', content);
