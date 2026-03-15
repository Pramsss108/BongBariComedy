const fs = require('fs');

let uiCode = fs.readFileSync('client/src/lib/bengali-tts-webgpu.ts', 'utf8');

// We need to add the speed parameter and handle streaming chunks
let newUiCode = uiCode.replace('export async function generateBengaliSpeechOffline(', 
\export interface TTSOptions {
    speed?: number;
}

/**
 * 100% OFFLINE Bengali WebGPU Engine
 */
export async function generateBengaliSpeechOffline(\);

newUiCode = newUiCode.replace('text: string,', 'text: string, options: TTSOptions = {},');

newUiCode = newUiCode.replace('ttsWorker!.postMessage({ action: \\'generate\\', payload: text, id: 2 });', 
'ttsWorker!.postMessage({ action: \\'generate\\', payload: text, speed: options.speed || 1.0, id: 2 });');

fs.writeFileSync('client/src/lib/bengali-tts-webgpu.ts', newUiCode);
console.log('UI updated for speed control.');
