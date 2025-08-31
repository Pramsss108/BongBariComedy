import { useEffect, useRef, useCallback } from 'react';

interface SparkleSoundOptions {
  enabled?: boolean;
  volume?: number;
  cooldownMs?: number;
}

export function useSparkleSound(options: SparkleSoundOptions = {}) {
  const { enabled = true, volume = 0.15, cooldownMs = 150 } = options;
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastPlayedRef = useRef<number>(0);

  // Initialize audio
  useEffect(() => {
    if (!enabled) return;

    // Create a simple sparkle sound using Web Audio API
    const createSparkleSound = () => {
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        // Create a gentle chime/bell sound
        const oscillator1 = audioContext.createOscillator();
        const oscillator2 = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        // High frequency gentle chime
        oscillator1.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator1.frequency.exponentialRampToValueAtTime(1200, audioContext.currentTime + 0.1);
        
        // Harmonic
        oscillator2.frequency.setValueAtTime(1200, audioContext.currentTime);
        oscillator2.frequency.exponentialRampToValueAtTime(1600, audioContext.currentTime + 0.08);
        
        // Gentle envelope
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(volume * 0.3, audioContext.currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.15);
        
        oscillator1.connect(gainNode);
        oscillator2.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator1.type = 'sine';
        oscillator2.type = 'triangle';
        
        oscillator1.start(audioContext.currentTime);
        oscillator2.start(audioContext.currentTime);
        
        oscillator1.stop(audioContext.currentTime + 0.15);
        oscillator2.stop(audioContext.currentTime + 0.15);
        
        return true;
      } catch (error) {
        console.log('Web Audio API not supported, falling back to simple beep');
        return false;
      }
    };

    // Store the sound creation function
    audioRef.current = { play: createSparkleSound } as any;

    return () => {
      audioRef.current = null;
    };
  }, [enabled, volume]);

  const playSparkleSound = useCallback(() => {
    if (!enabled || !audioRef.current) return;

    const now = Date.now();
    if (now - lastPlayedRef.current < cooldownMs) {
      return; // Prevent rapid-fire sounds
    }

    lastPlayedRef.current = now;

    // Play the sparkle sound
    try {
      (audioRef.current as any).play();
    } catch (error) {
      console.log('Sparkle sound could not play:', error);
    }
  }, [enabled, cooldownMs]);

  return {
    playSparkleSound,
    isEnabled: enabled,
  };
}