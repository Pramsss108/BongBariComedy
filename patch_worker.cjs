const fs = require('fs');
let code = fs.readFileSync('client/src/lib/tts.worker.ts', 'utf8');

const speedCode = `// PHASE 6: Streaming chunk signals (Return intermediate chunk early)
                self.postMessage({ type: 'chunk_generated', audio: result.audio, sampleRate: sampleRate, index: i });
                
                combinedAudio.push(result.audio);

                // PHASE 2: Variable Punctuation Timing
                if (i < chunks.length - 1) { 
                    const pauseLength = endsWithLongPause ? 0.6 : (endsWithComma ? 0.3 : 0.1);
                    const silenceFrames = new Float32Array(Math.floor(sampleRate * pauseLength)); 
                    combinedAudio.push(silenceFrames);
                }
            }

            if (combinedAudio.length === 0) {
                throw new Error("No text to synthesize");
            }

            const totalLength = combinedAudio.reduce((acc, arr) => acc + arr.length, 0);
            let finalAudio = new Float32Array(totalLength);
            
            let offset = 0;
            for (const arr of combinedAudio) {
                finalAudio.set(arr, offset);
                offset += arr.length;
            }

            // PHASE 9: Background Atmosphere Injection (Studio Mix)
            for (let i = 0; i < finalAudio.length; i++) {
                finalAudio[i] += (Math.random() * 2 - 1) * 0.002;
            }

            // PHASE 3: Audio Normalization Filter (Mastering)
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
            });`;

const startIdx = code.indexOf('combinedAudio.push(result.audio);');
if (startIdx !== -1) {
    let prefix = code.substring(0, startIdx);
    const catchIdx = code.indexOf('} catch (e: any) {', startIdx);
    if (catchIdx !== -1) {
        let suffix = code.substring(catchIdx);
        code = prefix + speedCode + '\n\n        ' + suffix;
        fs.writeFileSync('client/src/lib/tts.worker.ts', code);
        console.log('Worker patched successfully');
    }
}