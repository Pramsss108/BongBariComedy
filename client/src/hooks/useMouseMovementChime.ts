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

  // Initialize audio context and load custom audio file
  useEffect(() => {
    if (!enabled || !audioFile) return;

    const loadAudio = async () => {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        // Load the custom charm sound file
        const response = await fetch(audioFile);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
        audioBufferRef.current = audioBuffer;
        
      } catch (error) {
        console.log('Failed to load custom charm sound:', error);
      }
    };

    loadAudio();

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [enabled, audioFile]);

  const startChime = useCallback(() => {
    if (!enabled || !audioContextRef.current || !audioBufferRef.current) return;

    // Stop any existing sound first
    if (isPlayingRef.current) {
      stopChime();
      // Wait a moment for cleanup
      setTimeout(() => {
        startNewSound();
      }, 50);
      return;
    }

    startNewSound();

  function startNewSound() {
      try {
        const audioContext = audioContextRef.current;
        if (!audioContext || !audioBufferRef.current) return;

        // Create audio source from your custom charm sound
        const audioSource = audioContext.createBufferSource();
        const gainNode = audioContext.createGain();

        // Limiter: set gain ceiling
        const maxGain = 0.08; // Prevent high pitch/volume
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(Math.min(volume, maxGain), audioContext.currentTime + fadeInTime);

        // Connect nodes
        audioSource.connect(gainNode);
        gainNode.connect(audioContext.destination);

        // Set the custom charm sound buffer
        audioSource.buffer = audioBufferRef.current;
        audioSource.loop = false;

        // Start playing your custom charm sound
        audioSource.start(audioContext.currentTime);
        audioSource.stop(audioContext.currentTime + audioSource.buffer.duration);

        // Store references
        audioSourceRef.current = audioSource;
        gainNodeRef.current = gainNode;
        isPlayingRef.current = true;
      } catch (error) {
        console.log('Failed to play custom charm sound');
        isPlayingRef.current = false;
      }
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
      
      // Smoothly fade out the volume
      gainNodeRef.current.gain.setValueAtTime(volume, audioContext.currentTime);
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

  useEffect(() => {
    if (!enabled) return;
    let lastMoveTime = 0;
    let stopTimer: number | null = null;
    const movementThreshold = 8; // Adjusted for premium feel

    const handleMouseMove = (event: MouseEvent) => {
      const now = Date.now();
      if (now - lastMoveTime < 30) return; // Ignore rapid events
      lastMoveTime = now;
      const currentPos = { x: event.clientX, y: event.clientY };
      const lastPos = lastMousePosRef.current;
      const distance = Math.sqrt(
        Math.pow(currentPos.x - lastPos.x, 2) + Math.pow(currentPos.y - lastPos.y, 2)
      );
      if (distance >= movementThreshold) {
        startChime();
        if (stopTimer) {
          clearTimeout(stopTimer);
          stopTimer = null;
        }
        stopTimer = window.setTimeout(() => {
          stopChime();
        }, 120);
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

    document.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave, { passive: true });

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('scroll', handleScroll);
      document.removeEventListener('mouseleave', handleMouseLeave);
      if (stopTimer) {
        clearTimeout(stopTimer);
      }
      forceStop();
    };
  }, [enabled, startChime, stopChime, forceStop, movementThreshold]);

  return {
    isEnabled: enabled,
    isPlaying: isPlayingRef.current
  };
}