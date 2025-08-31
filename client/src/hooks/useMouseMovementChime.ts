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
      
      // Create gentle fairy dust chimes - much more pleasant and smooth
      const oscillators: OscillatorNode[] = [];
      const gainNodes: GainNode[] = [];
      
      // Soft, pleasant fairy dust frequencies - like tiny wind chimes
      const fairyFrequencies = [660, 880, 1100, 1320]; // Gentle harmonic series
      
      fairyFrequencies.forEach((freq, index) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        const filterNode = audioContext.createBiquadFilter();
        
        // Set up gentle low-pass filter for smooth, warm sound
        filterNode.type = 'lowpass';
        filterNode.frequency.setValueAtTime(2000, audioContext.currentTime);
        filterNode.Q.setValueAtTime(1, audioContext.currentTime); // Gentle filtering
        
        // Connect nodes
        oscillator.connect(filterNode);
        filterNode.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Use sine wave for pure, smooth fairy dust sound
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);
        
        // Add very gentle frequency modulation for magical shimmer
        const shimmerLfo = audioContext.createOscillator();
        const shimmerGain = audioContext.createGain();
        shimmerLfo.connect(shimmerGain);
        shimmerGain.connect(oscillator.frequency);
        
        shimmerLfo.type = 'sine';
        shimmerLfo.frequency.setValueAtTime(2 + Math.random() * 1, audioContext.currentTime); // Slow, gentle shimmer
        shimmerGain.gain.setValueAtTime(5 + Math.random() * 5, audioContext.currentTime); // Very subtle variation
        
        // Set up smooth volume envelope - gentle attack, long sustain
        const individualVolume = (volume / fairyFrequencies.length) * (0.7 + Math.random() * 0.3);
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(individualVolume, audioContext.currentTime + 0.3); // Slow gentle fade in
        
        // Start oscillators with small delays for fairy dust sparkle
        const startDelay = index * 0.05; // Gentle staggered start
        oscillator.start(audioContext.currentTime + startDelay);
        shimmerLfo.start(audioContext.currentTime + startDelay);
        
        oscillators.push(oscillator);
        gainNodes.push(gainNode);
      });
      
      // Store references
      oscillatorRef.current = oscillators[0];
      gainNodeRef.current = gainNodes[0];
      isPlayingRef.current = true;
      
      // Store all nodes for cleanup
      (oscillatorRef.current as any).allOscillators = oscillators;
      (gainNodeRef.current as any).allGainNodes = gainNodes;
      
    } catch (error) {
      console.log('Failed to create fairy dust sound');
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
      
      // Fade out fairy dust sounds very slowly and gently like emoji trail
      allGainNodes.forEach((gainNode: GainNode, index: number) => {
        const slowFadeTime = fadeOutTime * (2 + Math.random() * 1); // Much slower fade like emoji trail
        gainNode.gain.cancelScheduledValues(audioContext.currentTime);
        gainNode.gain.setValueAtTime(gainNode.gain.value, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + slowFadeTime); // Smooth exponential fade
      });
      
      // Stop all oscillators with gentle timing
      allOscillators.forEach((oscillator: OscillatorNode, index: number) => {
        const gentleStopTime = fadeOutTime * (2.5 + Math.random() * 0.5); // Even slower stop
        oscillator.stop(audioContext.currentTime + gentleStopTime);
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

  // Handle hover events instead of movement - much more pleasant
  useEffect(() => {
    if (!enabled) return;

    const handleMouseEnter = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      // Only play on hoverable elements - more selective and pleasant
      if (target.tagName === 'BUTTON' || 
          target.tagName === 'A' || 
          target.classList.contains('magical-hover') ||
          target.closest('button') ||
          target.closest('a') ||
          target.closest('.magical-hover')) {
        
        // Start fairy dust if not already playing
        if (!isPlayingRef.current) {
          startChime();
        }
      }
    };

    const handleMouseLeave = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      // Stop fairy dust when leaving hoverable elements
      if (target.tagName === 'BUTTON' || 
          target.tagName === 'A' || 
          target.classList.contains('magical-hover') ||
          target.closest('button') ||
          target.closest('a') ||
          target.closest('.magical-hover')) {
        
        // Set timeout for gentle fade out like emoji trail
        if (movementTimeoutRef.current) {
          clearTimeout(movementTimeoutRef.current);
        }
        
        movementTimeoutRef.current = window.setTimeout(() => {
          stopChime();
        }, 300); // Longer delay for more pleasant experience
      }
    };

    // Add hover listeners instead of movement
    document.addEventListener('mouseover', handleMouseEnter, { passive: true });
    document.addEventListener('mouseout', handleMouseLeave, { passive: true });

    return () => {
      document.removeEventListener('mouseover', handleMouseEnter);
      document.removeEventListener('mouseout', handleMouseLeave);
      
      // Clean up timeout
      if (movementTimeoutRef.current) {
        clearTimeout(movementTimeoutRef.current);
      }
      
      // Stop any playing sound
      stopChime();
    };
  }, [enabled, startChime, stopChime]);

  return {
    isEnabled: enabled,
    isPlaying: isPlayingRef.current
  };
}