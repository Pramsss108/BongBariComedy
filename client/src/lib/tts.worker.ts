import { pipeline, env } from '@huggingface/transformers';
import { preprocessBengaliText } from './bengali-preprocessor';

const USE_WEBGPU = false;
let bngTTSEngine: any = null;

// PHASE 5: Enable IndexedDB Caching (Removed cache clearing loop)
env.allowLocalModels = false;
env.allowRemoteModels = true;
// Huggingface models are cached automatically in the browser's Cache API.

self.onmessage = async (event) => {
    const { action, payload, id } = event.data;

    if (action === 'init') {
        try {
            if (!bngTTSEngine) {
                bngTTSEngine = await pipeline('text-to-speech', 'PRAMSSS/mms-tts-bengali-webgpu', {
                    device: USE_WEBGPU ? 'webgpu' : 'wasm',
                    dtype: 'fp32',
                    progress_callback: (prog: any) => {
                        self.postMessage({ type: 'progress', progress: prog });
                    }
                });
            }
            self.postMessage({ type: 'init_done', id });
        } catch (e: any) {
            self.postMessage({ type: 'error', error: e.message, id });
        }
    } 
    else if (action === 'generate') {
        try {
            const text = payload;

            // NO CHUNKING: The user requested full generation at once to avoid robotic resets
            self.postMessage({ type: 'chunk_status', message: `Pre-processing text...` });
            
            // Preprocess the ENTIRE text at once
            const processedText = preprocessBengaliText(text);
            
            // Limit excess whitespace/hyphens from the preprocessor to prevent long silent gaps
            const cleanText = processedText.replace(/\s+/g, ' ').trim();
            
            if (!cleanText) {
                throw new Error("No text to synthesize after preprocessing");
            }
            
            self.postMessage({ type: 'chunk_status', message: `Synthesizing full text...` });
            const result = await bngTTSEngine(cleanText);
            
            const sampleRate = result.sampling_rate;
            let finalAudio = result.audio;

            // PHASE 3: Audio Normalization Filter (Mastering)
            // Critical for VITS raw output which is often very quiet and causes clipping later
            let maxAmp = 0;
            for (let i = 0; i < finalAudio.length; i++) {
                const absAmp = Math.abs(finalAudio[i]);
                if (absAmp > maxAmp) maxAmp = absAmp;
            }
            if (maxAmp > 0) {
                const scalingFactor = 0.95 / maxAmp; 
                for (let i = 0; i < finalAudio.length; i++) {
                    finalAudio[i] *= scalingFactor;
                }
            }

            // PHASE 7: Speed / Pitch Warping implementation
            const reqSpeed = event.data.speed || 1.0;
            const finalSampleRate = Math.round(sampleRate * reqSpeed);

            self.postMessage({ 
                type: 'generate_done', 
                audio: finalAudio, 
                sampleRate: finalSampleRate,
                id 
            });

        } catch (e: any) {
            self.postMessage({ type: 'error', error: e.message, id });
        }
    }
};