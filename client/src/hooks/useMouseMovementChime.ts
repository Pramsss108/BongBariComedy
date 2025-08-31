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
    volume = 0.06, // Even more subtle for fairy dust
    frequency = 1200, // Higher, more magical frequency
    fadeInTime = 0.2, // Slower, smoother fade in
    fadeOutTime = 1.2, // Much longer fade out like emoji trail
    movementThreshold = 1 // More sensitive for fairy dust
  } = options;

  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const harmonicRef = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const harmonicGainRef = useRef<GainNode | null>(null);
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
      
      // Create magical fairy dust sound with multiple harmonics
      oscillator.type = 'sine'; // Pure sine wave for ethereal quality
      oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
      
      // Add gentle, dreamy frequency modulation for fairy dust sparkle
      const lfo = audioContext.createOscillator();
      const lfoGain = audioContext.createGain();
      lfo.connect(lfoGain);
      lfoGain.connect(oscillator.frequency);
      
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(1.5, audioContext.currentTime); // Slower, dreamier modulation
      lfoGain.gain.setValueAtTime(8, audioContext.currentTime); // Gentle frequency shimmer
      
      // Add a second harmonic for magical depth
      const harmonic = audioContext.createOscillator();
      const harmonicGain = audioContext.createGain();
      harmonic.connect(harmonicGain);
      harmonicGain.connect(audioContext.destination);
      
      harmonic.type = 'sine';
      harmonic.frequency.setValueAtTime(frequency * 1.5, audioContext.currentTime); // Perfect fifth
      harmonicGain.gain.setValueAtTime(0, audioContext.currentTime);
      harmonicGain.gain.linearRampToValueAtTime(volume * 0.3, audioContext.currentTime + fadeInTime);
      
      // Set initial volume to 0 and fade in
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(volume, audioContext.currentTime + fadeInTime);
      
      // Start all the magical fairy dust elements
      oscillator.start(audioContext.currentTime);
      harmonic.start(audioContext.currentTime);
      lfo.start(audioContext.currentTime);
      
      // Store references
      oscillatorRef.current = oscillator;
      harmonicRef.current = harmonic;
      gainNodeRef.current = gainNode;
      harmonicGainRef.current = harmonicGain;
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

      // Fade out both main and harmonic sounds gracefully
      gainNodeRef.current.gain.cancelScheduledValues(audioContext.currentTime);
      gainNodeRef.current.gain.setValueAtTime(gainNodeRef.current.gain.value, audioContext.currentTime);
      gainNodeRef.current.gain.linearRampToValueAtTime(0, audioContext.currentTime + fadeOutTime);
      
      if (harmonicGainRef.current) {
        harmonicGainRef.current.gain.cancelScheduledValues(audioContext.currentTime);
        harmonicGainRef.current.gain.setValueAtTime(harmonicGainRef.current.gain.value, audioContext.currentTime);
        harmonicGainRef.current.gain.linearRampToValueAtTime(0, audioContext.currentTime + fadeOutTime);
      }
      
      // Stop both oscillators after fade out
      oscillatorRef.current.stop(audioContext.currentTime + fadeOutTime);
      if (harmonicRef.current) {
        harmonicRef.current.stop(audioContext.currentTime + fadeOutTime);
      }
      
      // Clean up references
      setTimeout(() => {
        oscillatorRef.current = null;
        harmonicRef.current = null;
        gainNodeRef.current = null;
        harmonicGainRef.current = null;
        isPlayingRef.current = false;
      }, (fadeOutTime * 1000) + 100);
      
    } catch (error) {
      console.log('Failed to stop fairy dust sound');
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
        
        // Set timeout to stop fairy dust when movement stops (like emoji trail)
        movementTimeoutRef.current = window.setTimeout(() => {
          stopChime();
        }, 200); // Stop after 200ms of no movement for smoother experience
        
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