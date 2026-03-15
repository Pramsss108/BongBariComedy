import { pipeline, env } from '@huggingface/transformers';

// Tell transformers.js to use the browser cache, not local file system
env.allowLocalModels = false;
env.useBrowserCache = true;

class WhisperPipeline {
    static task = 'automatic-speech-recognition';
    static model = 'Xenova/whisper-tiny';
    static instance: any = null;

    static async getInstance(progress_callback: any = null) {
        if (this.instance === null) {
            this.instance = await pipeline(this.task as any, this.model, {
                progress_callback,
                dtype: 'q8' // 8-bit quantization for smaller size/faster load
            });
        }
        return this.instance;
    }
}

// Listen for messages from the main thread
self.addEventListener('message', async (event) => {
    try {
        const { audio, language } = event.data;

        // Load pipeline (or get cached instance)
        const transcriber = await WhisperPipeline.getInstance((progress: any) => {
            self.postMessage({ status: 'progress', progress });
        });

        self.postMessage({ status: 'processing' });

        // Run inference
        const output = await transcriber(audio, {
            language: language || 'en',
            task: 'transcribe',
            chunk_length_s: 30,
            stride_length_s: 5,
        });

        // Send the output back to the main thread
        self.postMessage({ status: 'complete', output });

    } catch (error: any) {
        self.postMessage({ status: 'error', error: error.message });
    }
});
