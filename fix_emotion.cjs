const fs = require('fs');

let workerCode = fs.readFileSync('client/src/lib/tts.worker.ts', 'utf8');

if (!workerCode.includes('// Phase 17: Contextual Emotion Distortion')) {
    workerCode = workerCode.replace(
        "            let chunkAudio = res.audio;",
        "            let chunkAudio = res.audio;\n\n" +
        "            // Phase 17: Contextual Emotion Distortion (Pseudo-SSML)\n" +
        "            // If the chunk ends with '?' or '!', we mathematically pitch-shift/speed-warp the array\n" +
        "            if (chunk.trim().endsWith('!') || chunk.trim().endsWith('?')) {\n" +
        "                const pitchShiftFactor = chunk.trim().endsWith('!') ? 1.05 : 1.02; // Excitement/Confusion\n" +
        "                const shiftedLength = Math.floor(chunkAudio.length / pitchShiftFactor);\n" +
        "                const shiftedAudio = new Float32Array(shiftedLength);\n" +
        "                for (let i = 0; i < shiftedLength; i++) {\n" +
        "                    const oldIndex = i * pitchShiftFactor;\n" +
        "                    const indexFloor = Math.floor(oldIndex);\n" +
        "                    const indexCeil = Math.min(Math.ceil(oldIndex), chunkAudio.length - 1);\n" +
        "                    const weight = oldIndex - indexFloor;\n" +
        "                    shiftedAudio[i] = chunkAudio[indexFloor] * (1 - weight) + chunkAudio[indexCeil] * weight;\n" +
        "                }\n" +
        "                chunkAudio = shiftedAudio;\n" +
        "            }"
    );
}

fs.writeFileSync('client/src/lib/tts.worker.ts', workerCode);
console.log('Phase 17 Applied Phase Shift');
