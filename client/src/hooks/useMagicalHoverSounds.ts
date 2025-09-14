import { useEffect, useRef, useCallback } from 'react';
import { getAudioContext, ensureAudioUnlocked, onAudioUnlocked, isAudioUnlocked, resumeAudioNow } from '@/lib/audioUnlock';

interface MagicalHoverSoundOptions {
  enabled?: boolean;
  volume?: number;
  cooldownMs?: number;
}

export function useMagicalHoverSounds(options: MagicalHoverSoundOptions = {}) {
  const { enabled = true, volume = 0.15, cooldownMs = 100 } = options;
  const sparkleAudioRef = useRef<HTMLAudioElement | null>(null);
  const magicAudioRef = useRef<HTMLAudioElement | null>(null);
  const lastPlayedRef = useRef<number>(0);

  // Initialize audio files
  useEffect(() => {
    if (!enabled) return;
    // Ensure a shared AudioContext is available and unlocked on first gesture
    ensureAudioUnlocked();

    const setup = () => {
      const audioContext = getAudioContext();
      if (!audioContext) return;
      
      // Create sparkle sound effect
      const createSparkleSound = () => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(1200, audioContext.currentTime + 0.1);
        
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(volume * 0.3, audioContext.currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.15);
        
        oscillator.type = 'sine';
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.15);
        
        return oscillator;
      };

      // Create magic chime sound effect
      const createMagicSound = () => {
        const oscillator1 = audioContext.createOscillator();
        const oscillator2 = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator1.connect(gainNode);
        oscillator2.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator1.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
        oscillator2.frequency.setValueAtTime(659.25, audioContext.currentTime); // E5
        
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(volume * 0.2, audioContext.currentTime + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3);
        
        oscillator1.type = 'sine';
        oscillator2.type = 'sine';
        
        oscillator1.start(audioContext.currentTime);
        oscillator2.start(audioContext.currentTime);
        oscillator1.stop(audioContext.currentTime + 0.3);
        oscillator2.stop(audioContext.currentTime + 0.3);
        
        return { oscillator1, oscillator2 };
      };

      sparkleAudioRef.current = {
        play: () => createSparkleSound(),
        pause: () => {},
        currentTime: 0,
        volume: volume
      } as any;

      magicAudioRef.current = {
        play: () => createMagicSound(),
        pause: () => {},
        currentTime: 0,
        volume: volume * 0.8
      } as any;
    };

    if (isAudioUnlocked()) {
      setup();
    } else {
      const off = onAudioUnlocked(setup);
      return () => {
        off && off();
        sparkleAudioRef.current = null;
        magicAudioRef.current = null;
      };
    }

    return () => {
      sparkleAudioRef.current = null;
      magicAudioRef.current = null;
    };
  }, [enabled, volume]);

  const playSparkleSound = useCallback((): void => {
    if (!enabled) return;
    if (typeof document !== 'undefined') {
      if (document.visibilityState === 'hidden') return;
      if (typeof document.hasFocus === 'function' && !document.hasFocus()) return;
    }
    const doPlay = () => {
      if (!sparkleAudioRef.current) return;
      const now = Date.now();
      if (now - lastPlayedRef.current < cooldownMs) return;
      lastPlayedRef.current = now;
      try {
        (sparkleAudioRef.current as any).play();
      } catch (_e) {}
    };
    if (!isAudioUnlocked()) {
      resumeAudioNow().then(doPlay).catch(() => {});
    } else {
      doPlay();
    }
  }, [enabled, cooldownMs]);

  const playMagicSound = useCallback((): void => {
    if (!enabled) return;
    if (typeof document !== 'undefined') {
      if (document.visibilityState === 'hidden') return;
      if (typeof document.hasFocus === 'function' && !document.hasFocus()) return;
    }
    const doPlay = () => {
      if (!magicAudioRef.current) return;
      const now = Date.now();
      if (now - lastPlayedRef.current < cooldownMs) return;
      lastPlayedRef.current = now;
      try {
        (magicAudioRef.current as any).play();
      } catch (_e) {}
    };
    if (!isAudioUnlocked()) {
      resumeAudioNow().then(doPlay).catch(() => {});
    } else {
      doPlay();
    }
  }, [enabled, cooldownMs]);

  // Add global hover listeners for magical elements
  useEffect(() => {
    if (!enabled) return;

    const handleHover = (event: Event) => {
      if (typeof document !== 'undefined') {
        if (document.visibilityState === 'hidden') return;
        if (typeof document.hasFocus === 'function' && !document.hasFocus()) return;
      }
      const target = event.target as HTMLElement;
      
      // Ensure target is an Element and has the matches method
      if (!target || target.nodeType !== Node.ELEMENT_NODE || !('matches' in target)) return;
      
      try {
        // Check tag names and classes for interactive elements
        const tagName = target.tagName?.toLowerCase();
        const className = target.className || '';
        const role = target.getAttribute('role');
        const href = target.getAttribute('href');
        
        // Play sounds for specific interactive elements
        const isButton = tagName === 'button' || role === 'button';
        const isInteractive = isButton || 
                             className.includes('card') ||
                             className.includes('video-container') ||
                             className.includes('hover-bounce') ||
                             className.includes('hover-wobble') ||
                             className.includes('hover-pulse') ||
                             className.includes('magical-hover') ||
                             (tagName === 'a' && href);
        
        if (isInteractive) {
          if (isButton) {
            playMagicSound();
          } else {
            playSparkleSound();
          }
        }
      } catch (error) {
        // Silently handle any errors
      }
    };

    // Add listeners for mouse enter events
    document.addEventListener('mouseover', handleHover, { passive: true });

    const onHide = () => {
      // Drop any references to ensure no scheduled plays continue
      lastPlayedRef.current = 0;
    };
    document.addEventListener('visibilitychange', onHide as any, { passive: true } as any);

    return () => {
      document.removeEventListener('mouseover', handleHover);
      document.removeEventListener('visibilitychange', onHide as any);
    };
  }, [enabled, playSparkleSound, playMagicSound]);

  return {
    playSparkleSound,
    playMagicSound,
    isEnabled: enabled,
    setVolume: (newVolume: number) => {
      if (sparkleAudioRef.current) {
        (sparkleAudioRef.current as any).volume = Math.max(0, Math.min(1, newVolume));
      }
      if (magicAudioRef.current) {
        (magicAudioRef.current as any).volume = Math.max(0, Math.min(1, newVolume * 0.8));
      }
    }
  };
}