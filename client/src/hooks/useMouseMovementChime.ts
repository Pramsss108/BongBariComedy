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
  const { 
    enabled = true, 
    volume = 0.06, // Subtle volume for custom charm
    audioFile = null, // Path to custom charm sound
    fadeInTime = 0.2, // Slower, smoother fade in
    fadeOutTime = 1.2, // Much longer fade out like emoji trail  
    movementThreshold = 1 // Sensitive for charm following cursor
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
        
        // Connect nodes
        audioSource.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Set the custom charm sound buffer
        audioSource.buffer = audioBufferRef.current;
        audioSource.loop = true; // Loop the charm sound while cursor moves
        
        // Set initial volume to 0 and smoothly fade in
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(volume, audioContext.currentTime + fadeInTime);
        
        // Start playing your custom charm sound
        audioSource.start(audioContext.currentTime);
        
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
        audioSourceRef.current = null;
        gainNodeRef.current = null;
        isPlayingRef.current = false;
        return;
      }

      // Gracefully fade out your custom charm sound (like emoji trail fading)
      gainNodeRef.current.gain.cancelScheduledValues(audioContext.currentTime);
      gainNodeRef.current.gain.setValueAtTime(gainNodeRef.current.gain.value, audioContext.currentTime);
      gainNodeRef.current.gain.linearRampToValueAtTime(0, audioContext.currentTime + fadeOutTime);
      
      // Stop the audio source after fade out
      audioSourceRef.current.stop(audioContext.currentTime + fadeOutTime);
      
      // Immediately mark as not playing
      isPlayingRef.current = false;
      
      // Clean up references after fade
      setTimeout(() => {
        audioSourceRef.current = null;
        gainNodeRef.current = null;
      }, (fadeOutTime * 1000) + 100);
      
    } catch (error) {
      console.log('Failed to stop custom charm sound');
      // Force cleanup on error
      audioSourceRef.current = null;
      gainNodeRef.current = null;
      isPlayingRef.current = false;
    }
  }, [fadeOutTime]);

  // Handle mouse movement
  useEffect(() => {
    if (!enabled) return;

    let isMoving = false;
    let stopTimer: number | null = null;

    const handleMouseMove = (event: MouseEvent) => {
      const currentPos = { x: event.clientX, y: event.clientY };
      const lastPos = lastMousePosRef.current;
      
      // Calculate movement distance
      const distance = Math.sqrt(
        Math.pow(currentPos.x - lastPos.x, 2) + Math.pow(currentPos.y - lastPos.y, 2)
      );
      
      // Only respond to significant movement
      if (distance >= movementThreshold) {
        // Mark as moving
        isMoving = true;
        
        // Start sound if not playing
        if (!isPlayingRef.current) {
          startChime();
        }
        
        // Clear any stop timer
        if (stopTimer) {
          clearTimeout(stopTimer);
          stopTimer = null;
        }
        
        // Set a new stop timer
        stopTimer = window.setTimeout(() => {
          isMoving = false;
          if (isPlayingRef.current) {
            stopChime();
          }
        }, 300); // Stop after 300ms of no significant movement
        
        lastMousePosRef.current = currentPos;
      }
    };

    // Add mouse move listener
    document.addEventListener('mousemove', handleMouseMove, { passive: true });

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      
      // Clean up timer
      if (stopTimer) {
        clearTimeout(stopTimer);
      }
      
      // Stop any playing sound
      if (isPlayingRef.current) {
        stopChime();
      }
    };
  }, [enabled, startChime, stopChime, movementThreshold]);

  return {
    isEnabled: enabled,
    isPlaying: isPlayingRef.current
  };
}