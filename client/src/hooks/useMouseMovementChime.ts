import { useEffect, useRef, useCallback } from 'react';

interface MouseMovementChimeOptions {
  enabled?: boolean;
  volume?: number;
  frequency?: number; // Base frequency for the chime
  fadeInTime?: number; // Time to fade in when movement starts
  fadeOutTime?: number; // Time to fade out when movement stops
  movementThreshold?: number; // Minimum movement to trigger sound
}

export function useMouseMovementChime(options: MouseMovementChimeOptions = {}) {
  const { 
    enabled = true, 
    volume = 0.08, // Very subtle volume
    frequency = 800, // Pleasant chime frequency
    fadeInTime = 0.1,
    fadeOutTime = 0.3,
    movementThreshold = 2 // Minimum pixels moved
  } = options;

  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const isPlayingRef = useRef(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });
  const movementTimeoutRef = useRef<number | null>(null);

  // Initialize audio context
  useEffect(() => {
    if (!enabled) return;

    try {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (error) {
      console.log('Web Audio API not supported');
    }

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [enabled]);

  const startChime = useCallback(() => {
    if (!enabled || !audioContextRef.current || isPlayingRef.current) return;

    try {
      const audioContext = audioContextRef.current;
      
      // Create oscillator for the chime sound
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      // Connect nodes
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Set up a gentle, magical chime sound
      oscillator.type = 'sine'; // Pure sine wave for clean chime
      oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
      
      // Add subtle frequency modulation for magical effect
      const lfo = audioContext.createOscillator();
      const lfoGain = audioContext.createGain();
      lfo.connect(lfoGain);
      lfoGain.connect(oscillator.frequency);
      
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(3, audioContext.currentTime); // 3Hz modulation
      lfoGain.gain.setValueAtTime(20, audioContext.currentTime); // Subtle frequency variation
      
      // Set initial volume to 0 and fade in
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(volume, audioContext.currentTime + fadeInTime);
      
      // Start the sound
      oscillator.start(audioContext.currentTime);
      lfo.start(audioContext.currentTime);
      
      // Store references
      oscillatorRef.current = oscillator;
      gainNodeRef.current = gainNode;
      isPlayingRef.current = true;
      
    } catch (error) {
      console.log('Failed to create chime sound');
    }
  }, [enabled, volume, frequency, fadeInTime]);

  const stopChime = useCallback(() => {
    if (!isPlayingRef.current || !gainNodeRef.current || !oscillatorRef.current) return;

    try {
      const audioContext = audioContextRef.current;
      if (!audioContext) return;

      // Fade out the sound
      gainNodeRef.current.gain.cancelScheduledValues(audioContext.currentTime);
      gainNodeRef.current.gain.setValueAtTime(gainNodeRef.current.gain.value, audioContext.currentTime);
      gainNodeRef.current.gain.linearRampToValueAtTime(0, audioContext.currentTime + fadeOutTime);
      
      // Stop the oscillator after fade out
      oscillatorRef.current.stop(audioContext.currentTime + fadeOutTime);
      
      // Clean up references
      setTimeout(() => {
        oscillatorRef.current = null;
        gainNodeRef.current = null;
        isPlayingRef.current = false;
      }, (fadeOutTime * 1000) + 100);
      
    } catch (error) {
      console.log('Failed to stop chime sound');
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
        
        // Clear existing timeout
        if (movementTimeoutRef.current) {
          clearTimeout(movementTimeoutRef.current);
        }
        
        // Set timeout to stop chime when movement stops
        movementTimeoutRef.current = window.setTimeout(() => {
          stopChime();
        }, 150); // Stop after 150ms of no movement
        
        lastMousePosRef.current = currentPos;
      }
    };

    // Add mouse move listener
    document.addEventListener('mousemove', handleMouseMove, { passive: true });

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      
      // Clean up timeout
      if (movementTimeoutRef.current) {
        clearTimeout(movementTimeoutRef.current);
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