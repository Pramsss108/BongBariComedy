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
      
      // Create multiple oscillators for magical glittery effect
      const oscillators: OscillatorNode[] = [];
      const gainNodes: GainNode[] = [];
      
      // Main magical sparkle frequencies (like tiny glittering sounds)
      const glitterFrequencies = [1200, 1800, 2400, 3000, 3600]; // High sparkly frequencies
      
      glitterFrequencies.forEach((freq, index) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        const filterNode = audioContext.createBiquadFilter();
        
        // Set up high-pass filter for sparkly effect
        filterNode.type = 'highpass';
        filterNode.frequency.setValueAtTime(1000, audioContext.currentTime);
        filterNode.Q.setValueAtTime(3, audioContext.currentTime);
        
        // Connect nodes
        oscillator.connect(filterNode);
        filterNode.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Use sawtooth for bright sparkly harmonics, then filter it
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);
        
        // Add random frequency shimmer for glitter effect
        const shimmerLfo = audioContext.createOscillator();
        const shimmerGain = audioContext.createGain();
        shimmerLfo.connect(shimmerGain);
        shimmerGain.connect(oscillator.frequency);
        
        shimmerLfo.type = 'sine';
        shimmerLfo.frequency.setValueAtTime(8 + Math.random() * 4, audioContext.currentTime); // Random shimmer speed
        shimmerGain.gain.setValueAtTime(30 + Math.random() * 20, audioContext.currentTime); // Random shimmer amount
        
        // Set up magical volume envelope - quick attack, gentle sustain
        const individualVolume = (volume / glitterFrequencies.length) * (0.5 + Math.random() * 0.5);
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(individualVolume, audioContext.currentTime + fadeInTime * (0.5 + Math.random() * 0.5));
        
        // Start oscillators with slight random delays for sparkle effect
        const startDelay = Math.random() * 0.02;
        oscillator.start(audioContext.currentTime + startDelay);
        shimmerLfo.start(audioContext.currentTime + startDelay);
        
        oscillators.push(oscillator);
        gainNodes.push(gainNode);
      });
      
      // Store references (we'll use the first ones for stopping)
      oscillatorRef.current = oscillators[0];
      gainNodeRef.current = gainNodes[0];
      isPlayingRef.current = true;
      
      // Store all nodes for cleanup
      (oscillatorRef.current as any).allOscillators = oscillators;
      (gainNodeRef.current as any).allGainNodes = gainNodes;
      
    } catch (error) {
      console.log('Failed to create magical glitter sound');
    }
  }, [enabled, volume, frequency, fadeInTime]);

  const stopChime = useCallback(() => {
    if (!isPlayingRef.current || !gainNodeRef.current || !oscillatorRef.current) return;

    try {
      const audioContext = audioContextRef.current;
      if (!audioContext) return;

      // Get all oscillators and gain nodes
      const allOscillators = (oscillatorRef.current as any).allOscillators || [oscillatorRef.current];
      const allGainNodes = (gainNodeRef.current as any).allGainNodes || [gainNodeRef.current];
      
      // Fade out all glitter sounds with randomized timing for magical effect
      allGainNodes.forEach((gainNode: GainNode, index: number) => {
        const randomFadeTime = fadeOutTime * (0.7 + Math.random() * 0.6); // Staggered fade out
        gainNode.gain.cancelScheduledValues(audioContext.currentTime);
        gainNode.gain.setValueAtTime(gainNode.gain.value, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + randomFadeTime);
      });
      
      // Stop all oscillators with staggered timing
      allOscillators.forEach((oscillator: OscillatorNode, index: number) => {
        const randomStopTime = fadeOutTime * (0.7 + Math.random() * 0.6);
        oscillator.stop(audioContext.currentTime + randomStopTime);
      });
      
      // Clean up references
      setTimeout(() => {
        oscillatorRef.current = null;
        gainNodeRef.current = null;
        isPlayingRef.current = false;
      }, (fadeOutTime * 1000) + 200);
      
    } catch (error) {
      console.log('Failed to stop magical glitter sound');
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