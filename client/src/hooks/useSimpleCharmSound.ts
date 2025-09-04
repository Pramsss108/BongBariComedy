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
    audio.loop = false; // Premium: never loop
    audio.preload = "auto";
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
    let isMoving = false;
    let fadeTimeout: number | null = null;
    let stopTimeout: number | null = null;

    const handleMouseMove = (e: MouseEvent) => {
      const currentX = e.clientX;
      const currentY = e.clientY;
      const distance = Math.sqrt(
        Math.pow(currentX - lastX, 2) + Math.pow(currentY - lastY, 2)
      );
      if (distance > 5) {
        if (!isMoving && audioRef.current) {
          audioRef.current.currentTime = 0;
          audioRef.current.volume = volume;
          audioRef.current.loop = true;
          audioRef.current.play().catch(() => {});
          isMoving = true;
        }
        if (stopTimeout) clearTimeout(stopTimeout);
        stopTimeout = window.setTimeout(() => {
          if (audioRef.current) {
            // Fade out over 1.2s
            let fadeVol = audioRef.current.volume;
            if (fadeTimeout) clearInterval(fadeTimeout);
            fadeTimeout = window.setInterval(() => {
              fadeVol -= 0.01;
              if (audioRef.current) audioRef.current.volume = Math.max(0, fadeVol);
              if (fadeVol <= 0) {
                if (audioRef.current) {
                  audioRef.current.pause();
                  audioRef.current.volume = volume;
                  audioRef.current.loop = false;
                }
                clearInterval(fadeTimeout!);
                isMoving = false;
              }
            }, 12); // ~1.2s fade
          }
        }, 200); // Mouse stop detection after 200ms
        lastX = currentX;
        lastY = currentY;
      }
    };

    document.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      if (stopTimeout) clearTimeout(stopTimeout);
      if (fadeTimeout) clearInterval(fadeTimeout);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.volume = volume;
        audioRef.current.loop = false;
      }
    };
  }, [enabled, audioFile, volume]);

  return {
    isEnabled: enabled,
    isPlaying: isPlayingRef.current
  };
}