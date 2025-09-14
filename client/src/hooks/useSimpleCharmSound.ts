import { useEffect, useRef } from 'react';
import { ensureAudioUnlocked, onAudioUnlocked, isAudioUnlocked, resumeAudioNow } from '@/lib/audioUnlock';

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
  // Note: no external timeout refs; we stop immediately on idle/leave.

  // Load audio file
  useEffect(() => {
    if (!enabled || !audioFile) return;
    ensureAudioUnlocked();

    const init = () => {
      const audio = new Audio(audioFile);
      audio.volume = volume;
      audio.loop = false; // Premium: never loop
      audio.preload = "auto";
      audioRef.current = audio;
    };

    if (isAudioUnlocked()) init();
    else {
      const off = onAudioUnlocked(init);
      return () => off && off();
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [enabled, audioFile, volume]);

  // Handle mouse movement (instant-on while moving, instant-off on idle)
  useEffect(() => {
    if (!enabled || !audioFile) return;
    ensureAudioUnlocked();

    let lastX = 0;
    let lastY = 0;
    let isMoving = false;
    let idleTimeout: number | null = null;

    const handleMouseMove = (e: MouseEvent) => {
      if (typeof document !== 'undefined') {
        if (document.visibilityState === 'hidden') return;
        if (typeof document.hasFocus === 'function' && !document.hasFocus()) return;
      }
      const currentX = e.clientX;
      const currentY = e.clientY;
      const distance = Math.sqrt(
        Math.pow(currentX - lastX, 2) + Math.pow(currentY - lastY, 2)
      );
      if (distance > 5) {
        if (audioRef.current) {
          if (!isAudioUnlocked()) {
            resumeAudioNow().catch(() => {});
          }
          if (!isMoving) {
            try { audioRef.current.pause(); audioRef.current.currentTime = 0; } catch {}
            audioRef.current.loop = true; // continuous while moving only
            audioRef.current.volume = volume;
            audioRef.current.play().catch(() => {});
            isMoving = true;
            isPlayingRef.current = true;
          }
          if (idleTimeout) clearTimeout(idleTimeout);
          idleTimeout = window.setTimeout(() => {
            // immediate stop on idle
            try { audioRef.current!.pause(); } catch {}
            audioRef.current!.loop = false;
            audioRef.current!.volume = volume;
            isMoving = false;
            isPlayingRef.current = false;
          }, 80);
        }
        lastX = currentX;
        lastY = currentY;
      }
    };

    const stopNow = () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.volume = volume;
  audioRef.current.loop = false;
      }
      isMoving = false;
      isPlayingRef.current = false;
      if (idleTimeout) clearTimeout(idleTimeout);
    };

    document.addEventListener("mousemove", handleMouseMove, { passive: true });
    const onVis = () => {
      if (document.visibilityState === 'hidden') {
        stopNow();
      }
    };
    document.addEventListener('visibilitychange', onVis as any, { passive: true } as any);
    window.addEventListener('blur', stopNow, { passive: true } as any);
    // Stop immediately when pointer leaves the window/document
    const pointerOutHandler = (e: PointerEvent) => {
      // relatedTarget === null indicates leaving the window
      if ((e as PointerEvent).relatedTarget === null) {
        stopNow();
      }
    };
    const mouseLeaveHandler = () => stopNow();
    window.addEventListener('pointerout', pointerOutHandler as any, { passive: true } as any);
    document.addEventListener('mouseleave', mouseLeaveHandler as any, { passive: true } as any);
    window.addEventListener('pointercancel', stopNow as any, { passive: true } as any);
    return () => {
  document.removeEventListener("mousemove", handleMouseMove);
  document.removeEventListener('visibilitychange', onVis as any);
  window.removeEventListener('blur', stopNow as any);
      window.removeEventListener('pointerout', pointerOutHandler as any);
  document.removeEventListener('mouseleave', mouseLeaveHandler as any);
  window.removeEventListener('pointercancel', stopNow as any);
  if (idleTimeout) clearTimeout(idleTimeout);
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