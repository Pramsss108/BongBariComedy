export type WhisperProgressState = 'idle' | 'loading' | 'processing' | 'ready' | 'error';

class WhisperEngine {
    private worker: Worker | null = null;
    private onProgress: ((msg: any) => void) | null = null;

    constructor() {
        this.initWorker();
    }

    private initWorker() {
        if (typeof window !== 'undefined') {
            this.worker = new Worker(new URL('./whisper-worker.ts', import.meta.url), {
                type: 'module'
            });

            this.worker.addEventListener('message', (event) => {
                if (this.onProgress) {
                    this.onProgress(event.data);
                }
            });
        }
    }

    public async transcribeAudio(audioBlob: Blob, language: string = 'en', onUpdate: (msg: any) => void): Promise<string> {
        return new Promise(async (resolve, reject) => {
            if (!this.worker) this.initWorker();

            this.onProgress = (data) => {
                onUpdate(data);
                if (data.status === 'complete') {
                    resolve(data.output.text);
                } else if (data.status === 'error') {
                    reject(new Error(data.error));
                }
            };

            try {
                // Must decode to Int16/Float32 for Whisper, but @huggingface/transformers
                // pipeline handles audio data natively if passed right.
                // Best is to pass a decoded array, but let's pass a standard audio context Float32Array

                const arrayBuffer = await audioBlob.arrayBuffer();
                const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
                const decodedBuffer = await audioContext.decodeAudioData(arrayBuffer);
                const audioData = decodedBuffer.getChannelData(0); // Whisper wants 16kHz mono Float32Array

                this.worker?.postMessage({
                    audio: audioData,
                    language
                });
            } catch (err: any) {
                reject(new Error("Failed to process audio for transcription: " + err.message));
            }
        });
    }

    public prewarm() {
        // Just instantiate to trigger the lazy load immediately if needed
        if (!this.worker) this.initWorker();
    }
}

export const whisperClient = new WhisperEngine();
