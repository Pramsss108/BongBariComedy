import { isDeviceAIElligible } from './device-check';
import { masterAudioTrack } from './audio-mastering';

let ttsWorker: Worker | null = null;
let isModelLoading = false;
let currentProgressCallback: ProgressCallback | undefined;

export type ProgressCallback = (message: string, progress?: number) => void;

export async function generateBengaliSpeechOffline(
    text: string,
    onProgress?: ProgressCallback
): Promise<string> {

    if (!isDeviceAIElligible()) {
        throw new Error("DEVICE_NOT_ELLIGIBLE: Cannot run local WebGPU engine on this device.");
    }

    currentProgressCallback = onProgress;

    return new Promise((resolve, reject) => {
        try {
            const startGeneration = () => {
                if (currentProgressCallback) currentProgressCallback("Injecting Breath markers and Synthesizing Bengali...");
                ttsWorker?.postMessage({
                    action: 'generate',
                    payload: text
                });
            };

            if (!ttsWorker) {
                if (isModelLoading) {
                    return reject(new Error("Bengali WebGPU Model is already loading. Please wait."));
                }

                isModelLoading = true;
                if (onProgress) onProgress("Initializing offline Bengali Web Worker pipeline...", 10);
                
                ttsWorker = new Worker(new URL('./tts.worker.ts', import.meta.url), { type: 'module' });
                
                ttsWorker.postMessage({ action: 'init' });
            }

            // ALWAYS bind the event listeners so they capture the current round's resolve/reject!
            ttsWorker.onmessage = (event) => {
                const { type, progress, error, audio, sampleRate, message } = event.data;
                console.log('[Worker Msg]', type, progress || message || error || '');

                if (type === 'progress') {
                    if (currentProgressCallback && progress) {
                        if (progress.status === 'downloading') {
                            const pct = Math.floor(progress.progress || 0);
                            currentProgressCallback('Downloading AI Brain... ' + pct + '%', Math.max(10, pct));
                        } else if (progress.status) {
                            currentProgressCallback('Loading: ' + progress.status.toUpperCase() + '...', 15);
                        }
                    }
                } else if (type === 'init_done') {
                    if (currentProgressCallback) currentProgressCallback("Bengali Model Ready. Warming up...", 100);
                    isModelLoading = false;
                    
                    startGeneration();
                } else if (type === 'chunk_status') {
                    if (currentProgressCallback) currentProgressCallback(message);
                } else if (type === 'generate_done') {
                    if (currentProgressCallback) currentProgressCallback("Phase 13: Web Audio Studio Mastering...", 99);
                    
                    masterAudioTrack(audio, sampleRate).then(masteredAudio => {
                        if (currentProgressCallback) currentProgressCallback("Rendering final master track...", 100);
                        const wavBlob = encodeWAV(masteredAudio, sampleRate);
                        const url = URL.createObjectURL(wavBlob);
                        resolve(url);
                    }).catch(e => {
                        console.error("Mastering failed", e);
                        const wavBlob = encodeWAV(audio, sampleRate);
                        const url = URL.createObjectURL(wavBlob);
                        resolve(url);
                    });
                } else if (type === 'error') {
                    isModelLoading = false;
                    console.error("[WebGPU Bengali TTS Worker] Error:", error);
                    reject(new Error('Web Worker Synthesis Failed: ' + error));
                }
            };

            ttsWorker.onerror = (error) => {
                isModelLoading = false;
                console.error("Worker generic error:", error);
                reject(new Error("Fatal Web Worker Error. Check console."));
            };

            // If it was already loaded from a previous run, start generation immediately!
            if (!isModelLoading && ttsWorker) {
                startGeneration();
            }

        } catch (error) {
            isModelLoading = false;
            console.error("WebGPU Engine boot error:", error);
            reject(error);
        }
    });
}

function encodeWAV(samples: Float32Array, sampleRate: number): Blob {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    const writeString = (offset: number, string: string) => {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + samples.length * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, samples.length * 2, true);

    let offset = 44;
    for (let i = 0; i < samples.length; i++, offset += 2) {
        let s = Math.max(-1, Math.min(1, samples[i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }

    return new Blob([view], { type: 'audio/wav' });
}
