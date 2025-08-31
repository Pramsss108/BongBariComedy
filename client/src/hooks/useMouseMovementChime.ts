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
    if (!enabled || !audioContextRef.current || !audioBufferRef.current || isPlayingRef.current) return;

    try {
      const audioContext = audioContextRef.current;
      
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
    }
  }, [enabled, volume, fadeInTime]);

  const stopChime = useCallback(() => {
    if (!isPlayingRef.current || !gainNodeRef.current || !audioSourceRef.current) return;

    try {
      const audioContext = audioContextRef.current;
      if (!audioContext) return;

      // Gracefully fade out your custom charm sound (like emoji trail fading)
      gainNodeRef.current.gain.cancelScheduledValues(audioContext.currentTime);
      gainNodeRef.current.gain.setValueAtTime(gainNodeRef.current.gain.value, audioContext.currentTime);
      gainNodeRef.current.gain.linearRampToValueAtTime(0, audioContext.currentTime + fadeOutTime);
      
      // Stop the audio source after fade out
      audioSourceRef.current.stop(audioContext.currentTime + fadeOutTime);
      
      // Clean up references
      setTimeout(() => {
        audioSourceRef.current = null;
        gainNodeRef.current = null;
        isPlayingRef.current = false;
      }, (fadeOutTime * 1000) + 100);
      
    } catch (error) {
      console.log('Failed to stop custom charm sound');
    }
  }, [fadeOutTime]);

  // Handle mouse movement
  useEffect(() => {
    if (!enabled) return;

    const handleMouseMove = (event: MouseEvent) => {
      const currentPos = { x: event.clientX, y: event.clientY };
      const lastPos = lastMousePosRef.current;
      
      // Calculate movement distance
      const distance = Math.sqrt(
        Math.pow(currentPos.x - lastPos.x, 2) + Math.pow(currentPos.y - lastPos.y, 2)
      );
      
      // Only play if movement is significant enough
      if (distance >= movementThreshold) {
        // Start chime if not already playing
        if (!isPlayingRef.current) {
          startChime();
        }
        
        // Clear existing timeout to keep playing while moving
        if (movementTimeoutRef.current) {
          clearTimeout(movementTimeoutRef.current);
          movementTimeoutRef.current = null;
        }
        
        lastMousePosRef.current = currentPos;
      }
    };

    const handleMouseStop = () => {
      // Clear any existing timeout
      if (movementTimeoutRef.current) {
        clearTimeout(movementTimeoutRef.current);
      }
      
      // Set timeout to stop charm when movement stops
      movementTimeoutRef.current = window.setTimeout(() => {
        if (isPlayingRef.current) {
          stopChime();
        }
      }, 200); // Stop after 200ms of no movement
    };

    // Add mouse move listener
    document.addEventListener('mousemove', handleMouseMove, { passive: true });
    
    // Add mouse stop detection (when not moving for a bit)
    let mouseMoveTimer: number | null = null;
    
    const detectMouseStop = () => {
      if (mouseMoveTimer) {
        clearTimeout(mouseMoveTimer);
      }
      mouseMoveTimer = window.setTimeout(handleMouseStop, 100);
    };
    
    document.addEventListener('mousemove', detectMouseStop, { passive: true });

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mousemove', detectMouseStop);
      
      // Clean up timeouts
      if (movementTimeoutRef.current) {
        clearTimeout(movementTimeoutRef.current);
      }
      if (mouseMoveTimer) {
        clearTimeout(mouseMoveTimer);
      }
      
      // Stop any playing sound
      stopChime();
    };
  }, [enabled, startChime, stopChime, movementThreshold]);

  return {
    isEnabled: enabled,
    isPlaying: isPlayingRef.current
  };
}