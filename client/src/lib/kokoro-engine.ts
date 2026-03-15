import { KokoroTTS } from "kokoro-js";
import { isDeviceAIElligible } from "./device-check";

let ttsEngine: KokoroTTS | null = null;
let isModelLoading = false;

/**
 * Splits text into logical chunks (sentences) roughly ~150-200 characters long to avoid 
 * OOM errors during local WASM inference.
 */
function chunkText(text: string, maxChunkLength: number = 200): string[] {
    // Simple sentence boundary split
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    const chunks: string[] = [];
    let currentChunk = "";

    for (const sentence of sentences) {
        if ((currentChunk + sentence).length > maxChunkLength) {
            if (currentChunk) chunks.push(currentChunk.trim());
            currentChunk = sentence;
        } else {
            currentChunk += " " + sentence;
        }
    }
    if (currentChunk.trim()) chunks.push(currentChunk.trim());
    return chunks;
}

/**
 * Concatenates multiple AudioBuffers into a single Float32Array
 * (Required since Kokoro processes sentences individually)
 */
function mergeAudioFloat32Arrays(arrays: Float32Array[]): Float32Array {
    let totalLength = 0;
    for (const arr of arrays) {
        totalLength += arr.length;
    }
    const result = new Float32Array(totalLength);
    let offset = 0;
    for (const arr of arrays) {
        result.set(arr, offset);
        offset += arr.length;
    }
    return result;
}

/**
 * Encodes raw PCM Float32Array audio data into a playable WAV Blob.
 */
function encodeWAV(samples: Float32Array, sampleRate: number): Blob {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    const writeString = (view: DataView, offset: number, string: string) => {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    };

    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + samples.length * 2, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true); // Mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(view, 36, 'data');
    view.setUint32(40, samples.length * 2, true);

    let offset = 44;
    for (let i = 0; i < samples.length; i++, offset += 2) {
        let s = Math.max(-1, Math.min(1, samples[i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }

    return new Blob([view], { type: 'audio/wav' });
}

export type ProgressCallback = (message: string, progress?: number) => void;

/**
 * Generates English speech locally in the browser using Kokoro 82M.
 * Implements strict LAZY LOADING and CHUNKING rules.
 */
export async function generateEnglishSpeech(
    text: string,
    voiceId: string = "af_sky",
    onProgress?: ProgressCallback
): Promise<string> {

    if (!isDeviceAIElligible()) {
        throw new Error("DEVICE_NOT_ELLIGIBLE");
    }

    // 1. LAZY LOAD THE MODEL
    if (!ttsEngine) {
        if (isModelLoading) {
            throw new Error("Model is already loading. Please wait.");
        }
        try {
            isModelLoading = true;
            if (onProgress) onProgress("Initializing Local Kokoro Engine...", 10);

            // Note: In browser environment, Kokoro-js handles downloading the ONNX weights automatically
            const tts = await KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-v1.0-ONNX", {
                dtype: "q8", // 8-bit quantization is essential for 4GB RAM phones to prevent OOM
            });

            if (onProgress) onProgress("Engine Ready. Warming up...", 100);
            ttsEngine = tts;
        } catch (error: any) {
            console.error("[Kokoro] Loading Failed:", error);
            ttsEngine = null;
            throw new Error(`Failed to load Kokoro Engine: ${error.message}`);
        } finally {
            isModelLoading = false;
        }
    }

    if (!ttsEngine) {
        throw new Error("Engine initialization failed silently.");
    }

    // 2. CHUNKING
    const chunks = chunkText(text);
    if (onProgress) onProgress(`Inferring ${chunks.length} neural blocks...`);

    try {
        const audioChunks: Float32Array[] = [];
        let sampleRate = 24000;

        for (let i = 0; i < chunks.length; i++) {
            if (onProgress) onProgress(`Synthesizing block ${i + 1}/${chunks.length}...`);

            // "af_sky" is a highly reliable default American English female voice in Kokoro
            // Other options include "am_adam" (American Male), "bf_emma" (British Female), etc.
            const rawAudio = await ttsEngine.generate(chunks[i], {
                voice: voiceId as any,
            });

            audioChunks.push(rawAudio.audio);
            sampleRate = rawAudio.sampling_rate;
        }

        if (onProgress) onProgress("Rendering final master track...");

        // 3. MERGE & ENCODE
        const masterFloat32 = mergeAudioFloat32Arrays(audioChunks);
        const wavBlob = encodeWAV(masterFloat32, sampleRate);
        const url = URL.createObjectURL(wavBlob);

        return url;

    } catch (error: any) {
        console.error("[Kokoro] Inference Failed:", error);

        // Check for common Out of Memory crash patterns
        if (error.message?.includes("memory") || error.message?.includes("OOM")) {
            throw new Error("DEVICE_NOT_ELLIGIBLE"); // Fallback trigger
        }

        throw new Error(`Synthesis Failed: ${error.message}`);
    }
}
