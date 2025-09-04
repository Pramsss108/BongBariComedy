import { useMagicalCursor } from '@/hooks/useMagicalCursor';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';

// Mobile detection utility
const isMobile = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
};

// Premium oscillator-based cursor sound
function useCursorSound() {
  const ctxRef = useRef<AudioContext | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const playingRef = useRef(false);

  const play = (frequency = 1200, type: OscillatorType = 'sine', harmonic = 1.5) => {
    if (playingRef.current) return;
    const ctx = ctxRef.current || new (window.AudioContext || (window as any).webkitAudioContext)();
    ctxRef.current = ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    gain.gain.setValueAtTime(0.08, ctx.currentTime); // Soft, premium volume
    osc.connect(gain);
    gain.connect(ctx.destination);
    // Harmonic
    const harmonicOsc = ctx.createOscillator();
    const harmonicGain = ctx.createGain();
    harmonicOsc.type = 'sine';
    harmonicOsc.frequency.setValueAtTime(frequency * harmonic, ctx.currentTime);
    harmonicGain.gain.setValueAtTime(0.03, ctx.currentTime);
    harmonicOsc.connect(harmonicGain);
    harmonicGain.connect(ctx.destination);
    // Fade out
    gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.18);
    harmonicGain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.18);
    osc.start(ctx.currentTime);
    harmonicOsc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.18);
    harmonicOsc.stop(ctx.currentTime + 0.18);
    oscRef.current = osc;
    gainRef.current = gain;
    playingRef.current = true;
    setTimeout(() => { playingRef.current = false; }, 180);
  };

  const stop = () => {
    if (oscRef.current) {
      try { oscRef.current.stop(); } catch(e) {}
      oscRef.current.disconnect();
      oscRef.current = null;
    }
    if (gainRef.current) {
      gainRef.current.disconnect();
      gainRef.current = null;
    }
    playingRef.current = false;
  };

  useEffect(() => () => {
    stop();
    if (ctxRef.current) {
      ctxRef.current.close();
      ctxRef.current = null;
    }
  }, []);

  return { play, stop };
}

const MagicalCursorWithSound = () => {
  const [isOnMobile, setIsOnMobile] = useState(false);
  const { cursorPosition, particles, isMoving, isClicking } = useMagicalCursor();
  const { isAuthenticated } = useAuth();
  const sound = useCursorSound();
  const lastMoveRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    setIsOnMobile(isMobile());
  }, []);

  useEffect(() => {
    if (!isOnMobile && !isAuthenticated) {
      const handleMove = (e: MouseEvent) => {
        const dx = e.clientX - lastMoveRef.current.x;
        const dy = e.clientY - lastMoveRef.current.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist > 8) {
          sound.play();
        } else {
          sound.stop();
        }
        lastMoveRef.current = { x: e.clientX, y: e.clientY };
      };
      const handleStop = () => sound.stop();
      document.addEventListener('mousemove', handleMove);
      document.addEventListener('mouseleave', handleStop);
      return () => {
        document.removeEventListener('mousemove', handleMove);
        document.removeEventListener('mouseleave', handleStop);
        sound.stop();
      };
    }
  }, [isOnMobile, isAuthenticated, sound]);

  if (isOnMobile || isAuthenticated) {
    return null;
  }

  return (
    <div className="magical-belan-portal">
      {/* ...existing belan cursor and particle rendering code from your MagicalCursor... */}
    </div>
  );
};

export default MagicalCursorWithSound;
