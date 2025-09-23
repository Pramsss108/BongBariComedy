import { useEffect, useRef, useCallback } from 'react';

interface MouseMovementChimeOptions {
  enabled?: boolean;
  volume?: number;
  audioFile?: string; // Path to custom audio file
  fadeInTime?: number; // Time to fade in when movement starts
  fadeOutTime?: number; // Time to fade out when movement stops
  movementThreshold?: number; // Minimum movement to trigger sound
}

export function useMouseMovementChime(options: MouseMovementChimeOptions = {}) {
  // Timers and movement tracking for event handlers
  const stopTimerRef = useRef<number | null>(null);
  const lastMoveTimeRef = useRef<number>(0);

  const { 
    enabled = true,
    volume = 0.06, // Subtle volume for custom charm
    audioFile = '/sounds/charm.mp3', // Path to custom charm sound
    fadeInTime = 0.12, // Short, soft fade in for premium feel
    fadeOutTime = 0.08, // Very fast fade out for instant stop
    movementThreshold = 8 // Tight, only play on real movement
  } = options;

  const audioContextRef = useRef<AudioContext | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const isPlayingRef = useRef(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });
  const movementTimeoutRef = useRef<number | null>(null);

  // Load audio buffer once when enabled / file changes
  useEffect(() => {
    if (!enabled || !audioFile) return;
    if (!audioContextRef.current) {
      try { audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)(); } catch {}
    }
    const ctx = audioContextRef.current;
    if (!ctx) return;
    let cancelled = false;
    fetch(audioFile)
      .then(r => r.arrayBuffer())
      .then(buf => ctx.decodeAudioData(buf))
      .then(decoded => { if (!cancelled) audioBufferRef.current = decoded; })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [enabled, audioFile]);

  // Stable startChime implementation
  const chimeCooldownRef = useRef<number>(0);
  const startChime = useCallback(() => {
    if (!enabled || !audioContextRef.current || !audioBufferRef.current) return;

      // Do not play when tab is hidden or window not focused
      if (typeof document !== 'undefined') {
        if (document.visibilityState === 'hidden') return;
        if (typeof document.hasFocus === 'function' && !document.hasFocus()) return;
      }

      // Debounce: never play more than once every 120ms
      const now = Date.now();
      if (now - chimeCooldownRef.current < 120) return;
      chimeCooldownRef.current = now;

      // Always stop any previous sound before starting a new one
      if (audioSourceRef.current) {
        try { audioSourceRef.current.stop(); } catch {}
        try { audioSourceRef.current.disconnect(); } catch {}
        audioSourceRef.current = null;
      }
      if (gainNodeRef.current) {
        try { gainNodeRef.current.disconnect(); } catch {}
        gainNodeRef.current = null;
      }
      isPlayingRef.current = false;

      // Try to resume context in case it was suspended by browser policy
      try {
        if ((audioContextRef.current as any).state === 'suspended') {
          (audioContextRef.current as any).resume().catch(() => {});
        }
      } catch {}

      // Start new sound (never overlaps)
      try {
        const audioContext = audioContextRef.current;
        if (!audioContext || !audioBufferRef.current) return;
        const audioSource = audioContext.createBufferSource();
        const gainNode = audioContext.createGain();
        const maxGain = 0.08;
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(Math.min(volume, maxGain), audioContext.currentTime + fadeInTime);
        audioSource.connect(gainNode);
        gainNode.connect(audioContext.destination);
        audioSource.buffer = audioBufferRef.current;
        audioSource.loop = false;
        audioSource.start(audioContext.currentTime);
        audioSource.stop(audioContext.currentTime + audioSource.buffer.duration);
        audioSourceRef.current = audioSource;
        gainNodeRef.current = gainNode;
        isPlayingRef.current = true;
    } catch (error) {
      isPlayingRef.current = false;
    }
  }, [enabled, volume, fadeInTime]);

  const stopChime = useCallback(() => {
    if (!isPlayingRef.current) return;

    try {
      const audioContext = audioContextRef.current;
      if (!audioContext || !gainNodeRef.current || !audioSourceRef.current) {
        // Force cleanup if references are missing
        isPlayingRef.current = false;
        audioSourceRef.current = null;
        gainNodeRef.current = null;
        return;
      }
      gainNodeRef.current.gain.linearRampToValueAtTime(0, audioContext.currentTime + fadeOutTime);
      
      // Stop the sound source
      audioSourceRef.current.stop(audioContext.currentTime + fadeOutTime);
      
      // Cleanup references
      isPlayingRef.current = false;
      audioSourceRef.current = null;
      gainNodeRef.current = null;
      
    } catch (error) {
      console.log('Error stopping chime:', error);
    }
  }, [fadeOutTime, volume]);

  // Add forceStop function
  const forceStop = () => {
    if (audioSourceRef.current) {
      try { audioSourceRef.current.stop(); } catch(e) {}
      audioSourceRef.current.disconnect();
      audioSourceRef.current = null;
    }
    if (gainNodeRef.current) {
      gainNodeRef.current.disconnect();
      gainNodeRef.current = null;
    }
    isPlayingRef.current = false;
  };

  // Timers and movement tracking for event handlers
  const stopTimer = useRef<number | null>(null);
  const lastMoveTime = useRef<number>(0);

  const isInteractive = (el: Element | null): boolean => {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return false;
    const tag = (el as HTMLElement).tagName?.toLowerCase();
    const role = (el as HTMLElement).getAttribute?.('role');
    const cls = (el as HTMLElement).className?.toString() || '';
    const href = (el as HTMLElement).getAttribute?.('href');
    return (
      tag === 'button' || role === 'button' || tag === 'input' || tag === 'select' || tag === 'textarea' ||
      (tag === 'a' && !!href) ||
      /hover-|magical-hover|nav|menu|link|btn|card|video-container|clickable|cursor-pointer/.test(cls)
    );
  };

  useEffect(() => {
    if (!enabled) return;
    let lastMove = 0;
    let localStopTimer: number | null = null;

    const handleMouseMove = (event: MouseEvent) => {
      // Ignore when page is hidden or not focused
      if (document.visibilityState === 'hidden' || (typeof document.hasFocus === 'function' && !document.hasFocus())) {
        forceStop();
        return;
      }
      const now = Date.now();
      if (now - lastMove < 30) return; // Ignore rapid events
      lastMove = now;
      const cx = event.clientX;
      const cy = event.clientY;
      // Guard against browsers occasionally emitting non-finite values
      if (!Number.isFinite(cx) || !Number.isFinite(cy)) {
        return; // skip this event quietly
      }
      const currentPos = { x: cx, y: cy };
      const lastPos = lastMousePosRef.current;
      const distance = Math.hypot(currentPos.x - lastPos.x, currentPos.y - lastPos.y);
      let el: Element | null = null;
      try {
        el = document.elementFromPoint(cx, cy);
      } catch {
        // ignore elementFromPoint errors
      }
      const overInteractive = isInteractive(el as Element);
      if (distance >= movementThreshold && overInteractive) {
        startChime();
        if (localStopTimer) {
          clearTimeout(localStopTimer);
          localStopTimer = null;
        }
        // Tight fade-out after movement stops
        localStopTimer = window.setTimeout(() => {
          stopChime();
        }, 90);
        lastMousePosRef.current = currentPos;
      } else {
        stopChime();
      }
    };

    const handleScroll = () => {
      forceStop();
    };

    const handleMouseLeave = () => {
      forceStop();
    };

    const handleBlur = () => {
      forceStop();
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        forceStop();
      }
    };

  document.addEventListener('mousemove', handleMouseMove, { passive: true });
  document.addEventListener('scroll', handleScroll, { passive: true });
  document.addEventListener('mouseleave', handleMouseLeave, { passive: true });
  window.addEventListener('blur', handleBlur, { passive: true } as any);
  document.addEventListener('visibilitychange', handleVisibility as any, { passive: true } as any);

  // Extra: force stop on pagehide (mobile/tab close/minimize)
  window.addEventListener('pagehide', forceStop, { passive: true } as any);
  window.addEventListener('unload', forceStop, { passive: true } as any);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('scroll', handleScroll);
      document.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('blur', handleBlur as any);
      document.removeEventListener('visibilitychange', handleVisibility as any);
      window.removeEventListener('pagehide', forceStop as any);
      window.removeEventListener('unload', forceStop as any);
      if (localStopTimer) clearTimeout(localStopTimer);
      forceStop();
    };
  }, [enabled, startChime, stopChime, movementThreshold]);

  return {
    isEnabled: enabled,
    isPlaying: isPlayingRef.current
  };
}
