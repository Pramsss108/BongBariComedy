import { useEffect, useRef } from 'react';

interface SimpleCharmSoundOptions {
  enabled?: boolean;
  volume?: number;
  audioFile?: string;
}

export function useSimpleCharmSound(options: SimpleCharmSoundOptions = {}) {
  const { 
    enabled = true, 
    volume = 0.06, 
    audioFile = null 
  } = options;

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isPlayingRef = useRef(false);
  const timeoutRef = useRef<number | null>(null);

  // Load audio file
  useEffect(() => {
    if (!enabled || !audioFile) return;

    const audio = new Audio(audioFile);
    audio.volume = volume;
    audio.loop = true;
    audio.preload = 'auto';
    audioRef.current = audio;

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [enabled, audioFile, volume]);

  // Handle mouse movement
  useEffect(() => {
    if (!enabled || !audioFile) return;

    let lastX = 0;
    let lastY = 0;
    let moveCount = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const currentX = e.clientX;
      const currentY = e.clientY;
      
      // Calculate distance moved
      const distance = Math.sqrt(
        Math.pow(currentX - lastX, 2) + Math.pow(currentY - lastY, 2)
      );

      // Only trigger on significant movement (not tiny scroll movements)
      if (distance > 5) {
        moveCount++;
        
        // Start playing after a few movements to avoid false triggers
        if (moveCount > 2 && !isPlayingRef.current && audioRef.current) {
          audioRef.current.currentTime = 0;
          audioRef.current.play().catch(() => {
            // Ignore play errors
          });
          isPlayingRef.current = true;
        }

        // Clear any existing timeout
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        // Set timeout to stop sound when movement stops
        timeoutRef.current = window.setTimeout(() => {
          if (isPlayingRef.current && audioRef.current) {
            audioRef.current.pause();
            isPlayingRef.current = false;
          }
          moveCount = 0; // Reset move count
        }, 500);

        lastX = currentX;
        lastY = currentY;
      }
    };

    const handleScroll = () => {
      // Force stop on scroll
      if (isPlayingRef.current && audioRef.current) {
        audioRef.current.pause();
        isPlayingRef.current = false;
      }
      moveCount = 0;
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };

    document.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('wheel', handleScroll, { passive: true });

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('scroll', handleScroll);
      document.removeEventListener('wheel', handleScroll);
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      if (audioRef.current) {
        audioRef.current.pause();
      }
      isPlayingRef.current = false;
    };
  }, [enabled, audioFile]);

  return {
    isEnabled: enabled,
    isPlaying: isPlayingRef.current
  };
}