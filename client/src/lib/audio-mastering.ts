import { getHardwareProfile } from './device-check';
/**
 * VIBE CODER PHASE 13: In-Browser Studio Mastering (The Psychoacoustic Exciter)
 * Uses the Web Audio API OfflineAudioContext to apply professional podcast 
 * EQ and Dynamics Compression to the raw mathematical Float32Array audio.
 * This removes the "muffled digital" AI sound and makes it sound like a high-end mic.
 */

export async function masterAudioTrack(rawAudio: Float32Array, sampleRate: number): Promise<Float32Array> {
    // 1. Create a lightning-fast offline render context
    const ctx = new OfflineAudioContext(1, rawAudio.length, sampleRate);
    
    // 2. Load the raw AI model output into an audio buffer
    const buffer = ctx.createBuffer(1, rawAudio.length, sampleRate);
    buffer.getChannelData(0).set(rawAudio);

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    // -------------------------------------------------------------
    // PHASE 13 & 18: THE HOLLYWOOD AUDIO RACK 
    // -------------------------------------------------------------

    // A. Biquad Filter 1: LowShelf (Adds "Warmth" and Chest Resonance)
    const lowShelf = ctx.createBiquadFilter();
    lowShelf.type = 'lowshelf';
    lowShelf.frequency.value = 160; 
    lowShelf.gain.value = 3.5; // Boost bass frequencies by +3.5dB

    // B. Biquad Filter 2: HighShelf (Adds "Sparkle" and Consonant Clarity)
    const highShelf = ctx.createBiquadFilter();
    highShelf.type = 'highshelf';
    highShelf.frequency.value = 5000;
    highShelf.gain.value = 3.0; // Boost high end to remove the 'muffled' artifact

    // C. Dynamics Compressor (The Podcast Auto-Leveler)
    // Makes quiet whispers audible and screams compressed so the user's ears don't bleed
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -20; // Engage compression at -20dB
    compressor.knee.value = 8;        // Soft curve
    compressor.ratio.value = 4;       // 4:1 broadcast standard compression
    compressor.attack.value = 0.003;  // Fast attack to catch peaks
    compressor.release.value = 0.15;  // Smooth natural release

    // 3. Connect the Analog Cabling inside the browser memory:
    // Source -> Bass Boost -> Sparkle EQ -> Leveler -> Output
    source.connect(lowShelf);
    lowShelf.connect(highShelf);
    highShelf.connect(compressor);
    compressor.connect(ctx.destination);

    source.start(0);

    // 4. Render the mastered track entirely in the background
    const renderedBuffer = await ctx.startRendering();
    
    // Return the mastered Float32Array for WAV encoding
    return renderedBuffer.getChannelData(0);
}