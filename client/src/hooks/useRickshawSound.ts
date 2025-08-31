import { useEffect, useRef, useCallback } from 'react';
import { useToast } from './use-toast';

interface RickshawSoundOptions {
  enabled?: boolean;
  volume?: number;
  cooldownMs?: number; // Prevent too many sounds at once
}

export function useRickshawSound(options: RickshawSoundOptions = {}) {
  const { enabled = true, volume = 0.3, cooldownMs = 200 } = options;
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastPlayedRef = useRef<number>(0);
  const { toast } = useToast();

  // Initialize audio
  useEffect(() => {
    if (!enabled) return;

    // Load the rickshaw sound from Object Storage
    // File is uploaded to public/sounds/ in Object Storage
    const audio = new Audio('/public-objects/sounds/rickshaw-pao.mp3');
    audio.volume = volume;
    audio.preload = 'auto';
    
    // Handle loading errors gracefully
    audio.addEventListener('error', () => {
      console.log('Rickshaw sound not found yet - please upload your audio file');
    });

    audioRef.current = audio;

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [enabled, volume]);

  const playRickshawSound = useCallback(() => {
    if (!enabled || !audioRef.current) return;

    const now = Date.now();
    if (now - lastPlayedRef.current < cooldownMs) {
      return; // Prevent rapid-fire sounds
    }

    lastPlayedRef.current = now;

    // Reset audio to beginning for quick successive plays
    audioRef.current.currentTime = 0;
    
    // Play the sound
    audioRef.current.play().catch((error) => {
      // Handle autoplay restrictions gracefully
      console.log('Rickshaw sound autoplay blocked:', error);
    });
  }, [enabled, cooldownMs]);

  // Add global tap/click listeners
  useEffect(() => {
    if (!enabled) return;

    const handleTap = (event: Event) => {
      // Only play on actual interactive elements or body
      const target = event.target as HTMLElement;
      
      // Skip if clicking on form inputs, textareas, or other input elements
      if (target.tagName === 'INPUT' || 
          target.tagName === 'TEXTAREA' || 
          target.tagName === 'SELECT' ||
          target.contentEditable === 'true') {
        return;
      }

      // Skip if element or its parent has no-rickshaw-sound class
      let currentElement: HTMLElement | null = target;
      while (currentElement && currentElement !== document.body) {
        if (currentElement.classList?.contains('no-rickshaw-sound')) {
          return;
        }
        currentElement = currentElement.parentElement;
      }

      playRickshawSound();
    };

    // Add listeners for both touch and click events
    document.addEventListener('touchstart', handleTap, { passive: true });
    document.addEventListener('click', handleTap, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTap);
      document.removeEventListener('click', handleTap);
    };
  }, [enabled, playRickshawSound]);

  return {
    playRickshawSound,
    isEnabled: enabled,
    setVolume: (newVolume: number) => {
      if (audioRef.current) {
        audioRef.current.volume = Math.max(0, Math.min(1, newVolume));
      }
    }
  };
}