import { useCallback } from 'react';

interface FunnySubmissionSoundOptions {
  enabled?: boolean;
  volume?: number;
}

export function useFunnySubmissionSound(options: FunnySubmissionSoundOptions = {}) {
  const { enabled = true, volume = 0.25 } = options;

  const playFunnySubmissionSound = useCallback(() => {
    if (!enabled) return;

    try {
      // Create a funny Bengali comedy sound using Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Create a funny "success" sound with multiple tones
      const createFunnySound = () => {
        const now = audioContext.currentTime;
        
        // Main celebration tone (higher pitch)
        const oscillator1 = audioContext.createOscillator();
        const gain1 = audioContext.createGain();
        oscillator1.connect(gain1);
        gain1.connect(audioContext.destination);
        
        // Secondary harmonious tone 
        const oscillator2 = audioContext.createOscillator();
        const gain2 = audioContext.createGain();
        oscillator2.connect(gain2);
        gain2.connect(audioContext.destination);
        
        // Fun wobble bass tone
        const oscillator3 = audioContext.createOscillator();
        const gain3 = audioContext.createGain();
        oscillator3.connect(gain3);
        gain3.connect(audioContext.destination);
        
        // Set up the funny sequence
        // First note - high celebratory "ding"
        oscillator1.frequency.setValueAtTime(880, now); // A5
        oscillator1.frequency.exponentialRampToValueAtTime(1174.66, now + 0.1); // D6
        gain1.gain.setValueAtTime(0, now);
        gain1.gain.linearRampToValueAtTime(volume * 0.4, now + 0.02);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        
        // Second note - harmonious middle tone
        oscillator2.frequency.setValueAtTime(523.25, now + 0.1); // C5
        oscillator2.frequency.exponentialRampToValueAtTime(659.25, now + 0.2); // E5
        gain2.gain.setValueAtTime(0, now + 0.1);
        gain2.gain.linearRampToValueAtTime(volume * 0.3, now + 0.12);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        
        // Third note - fun wobble bass (comedic effect)
        oscillator3.frequency.setValueAtTime(130.81, now + 0.2); // C3
        oscillator3.frequency.exponentialRampToValueAtTime(146.83, now + 0.35); // D3
        gain3.gain.setValueAtTime(0, now + 0.2);
        gain3.gain.linearRampToValueAtTime(volume * 0.2, now + 0.22);
        gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        
        // Use different wave types for variety
        oscillator1.type = 'sine'; // Clean celebration
        oscillator2.type = 'triangle'; // Warm harmony
        oscillator3.type = 'square'; // Fun comedic bass
        
        // Start all oscillators
        oscillator1.start(now);
        oscillator2.start(now + 0.1);
        oscillator3.start(now + 0.2);
        
        // Stop all oscillators
        oscillator1.stop(now + 0.3);
        oscillator2.stop(now + 0.4);
        oscillator3.stop(now + 0.5);
        
        // Add a final high "success ding"
        setTimeout(() => {
          const finalOsc = audioContext.createOscillator();
          const finalGain = audioContext.createGain();
          finalOsc.connect(finalGain);
          finalGain.connect(audioContext.destination);
          
          const finalNow = audioContext.currentTime;
          finalOsc.frequency.setValueAtTime(1760, finalNow); // A6 - very high success tone
          finalGain.gain.setValueAtTime(0, finalNow);
          finalGain.gain.linearRampToValueAtTime(volume * 0.5, finalNow + 0.01);
          finalGain.gain.exponentialRampToValueAtTime(0.001, finalNow + 0.2);
          
          finalOsc.type = 'sine';
          finalOsc.start(finalNow);
          finalOsc.stop(finalNow + 0.2);
        }, 400);
      };

      createFunnySound();
      
    } catch (error) {
      // Fallback: Try to play a simple success sound
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(1200, audioContext.currentTime + 0.2);
        
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(volume, audioContext.currentTime + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3);
        
        oscillator.type = 'sine';
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
      } catch (fallbackError) {
        // Silently handle if no audio support
        console.log('Audio not supported');
      }
    }
  }, [enabled, volume]);

  return {
    playFunnySubmissionSound,
    isEnabled: enabled
  };
}