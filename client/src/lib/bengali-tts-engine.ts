/**
 * Bengali TTS Engine — LOCKED PRODUCTION ARCHITECTURE
 *
 * Meta MMS TTS
 * Why MMS:
 * - Trained on 1100+ languages with thousands of hours of Bengali speech data  
 * - Runs on always-on CPU Space (no ZeroGPU cold-start BS)
 * - VITS architecture for end-to-end speech synthesis
 * - Best free Bengali pronunciation available
 */

const MMS_SPACES = [
    "https://dpc-mmstts.hf.space",
    "https://facebook-mms-tts.hf.space"
];

export async function generateWithMMS(text: string): Promise<ArrayBuffer> {
    // Client-side rotation over Hugging Face Spaces
    let lastError = null;

    for (const spaceUrl of MMS_SPACES) {
        try {
            console.log(`Trying MMS space: ${spaceUrl}`);
            const res = await fetch(`${spaceUrl}/api/predict`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ data: [text, "Bengali (ben)"] }),        
            });

            if (!res.ok) continue;

            const json = await res.json();
            if (json.data?.[0]?.name) {
                const audioRes = await fetch(`${spaceUrl}/file=${json.data[0].name}`);
                if (!audioRes.ok) continue;
                return await audioRes.arrayBuffer();
            }
        } catch (e) {
            lastError = e;
            console.warn(`Space ${spaceUrl} failed:`, e);
            continue; // Move to next space on failure
        }
    }

    throw new Error(`All MMS fallbacks exhausted. Last error: ${lastError?.toString()}`);
}

// ============================================================
// Engine metadata for UI
// ============================================================
export interface BengaliTTSEngine {
    id: string;
    name: string;
    description: string;
    quality: number;
    speed: string;
    status: "online" | "cold-start" | "experimental" | "offline";
    generate: (text: string) => Promise<ArrayBuffer>;
}

export const BENGALI_ENGINES: BengaliTTSEngine[] = [
    {
        id: "mms_offline",
        name: "Meta MMS (WebGPU) [COMING SOON]",
        description: "100% Offline. Developer must run V17 Python ONNX conversion first.",
        quality: 4,
        speed: "instant",
        status: "experimental",
        // Handled specially in VoiceHub due to generating Blob URL directly,   
        // but we satisfy interface by throwing if used wrong.
        generate: async () => { throw new Error("Offline engine handled internally"); },
    },
    {
        id: "mms",
        name: "Meta MMS",
        description: "Trained on 1100+ languages. Best free Bengali TTS. Always online.",
        quality: 3,
        speed: "fast",
        status: "online",
        generate: (text) => generateWithMMS(text),
    },
];

export function getEngine(id: string): BengaliTTSEngine | undefined {
    return BENGALI_ENGINES.find(e => e.id === id);
}
