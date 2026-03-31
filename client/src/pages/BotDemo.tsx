import { useState, useEffect, useRef } from 'react';
import BongBotHero from '@/components/BongBotHero';

type Personality = 'happy' | 'excited' | 'thinking' | 'sleepy' | 'sipping';

interface PersonalityConfig {
  label: string;
  emoji: string;
  phraseBengali: string;
  phraseEnglish: string;
  eyeScale: number;
  blushIntensity: number;
  headTilt: number;
  antennaPulse: number;
}

export default function BotDemo() {
  const [cursorPos, setCursorPos]   = useState({ x: 0, y: 0 });
  const [personality, setPersonality] = useState<Personality>('happy');
  const [cfg, setCfg] = useState<PersonalityConfig | null>(null);
  const [labelVisible, setLabelVisible] = useState(true);
  const labelTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const handler = (e: MouseEvent) => setCursorPos({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', handler);
    return () => window.removeEventListener('mousemove', handler);
  }, []);

  const handlePersonality = (p: Personality, config: PersonalityConfig) => {
    setPersonality(p);
    setCfg(config);
    setLabelVisible(true);
    clearTimeout(labelTimerRef.current);
    labelTimerRef.current = setTimeout(() => setLabelVisible(false), 2800);
  };

  // Accent colour per personality
  const accentColour: Record<Personality, string> = {
    happy:   '#f0c12c',
    excited: '#ff7f3b',
    thinking:'#7bb8f0',
    sleepy:  '#9b8fe0',
    sipping: '#ff9a3c',
  };
  const accent = accentColour[personality] ?? '#f0c12c';

  return (
    <div className="fixed inset-0 overflow-hidden flex flex-col items-center justify-center select-none"
      style={{ background: 'radial-gradient(ellipse 80% 80% at 50% 40%, #0e101e 0%, #060710 100%)' }}>

      {/* ── Cursor radial glow ── */}
      <div className="absolute inset-0 pointer-events-none transition-opacity duration-700"
        style={{
          background: `radial-gradient(circle at ${cursorPos.x}px ${cursorPos.y}px, ${accent}15 0%, transparent 42%)`,
        }} />

      {/* ── Ambient orbs ── */}
      <div className="absolute top-1/4 left-1/6 w-64 h-64 rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, ${accent}08 0%, transparent 70%)`, mixBlendMode: 'screen' }} />
      <div className="absolute bottom-1/4 right-1/6 w-80 h-80 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, #7b5ff010 0%, transparent 70%)', mixBlendMode: 'screen' }} />

      {/* ── Subtle grid ── */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.028]"
        xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="grid" width="42" height="42" patternUnits="userSpaceOnUse">
            <path d="M 42 0 L 0 0 0 42" fill="none" stroke="white" strokeWidth="1"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      {/* ── Header ── */}
      <header className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 py-4">
        <a href="/"
          className="group flex items-center gap-2 text-white/30 hover:text-white/80 text-sm font-mono transition-all duration-300">
          <span className="group-hover:-translate-x-1 transition-transform duration-200 inline-block">←</span>
          <span className="tracking-wider text-xs">BACK</span>
        </a>

        <div className="flex flex-col items-center gap-0.5">
          <div className="text-xs font-mono tracking-[0.35em] uppercase"
            style={{ color: accent, textShadow: `0 0 18px ${accent}70` }}>
            Bong Bot
          </div>
          <div className="text-[10px] font-mono text-white/20 tracking-[0.25em] uppercase">Interactive Demo</div>
        </div>

        <div className="text-white/20 text-xs font-mono tracking-wider">
          Move cursor
        </div>
      </header>

      {/* ── Stage: Personality badge ── */}
      <div
        className="absolute top-16 left-1/2 -translate-x-1/2 z-30 pointer-events-none"
        style={{
          opacity: labelVisible ? 1 : 0,
          transition: 'opacity 0.6s ease',
        }}>
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full border backdrop-blur-sm"
          style={{
            borderColor: `${accent}50`,
            background: `${accent}12`,
            boxShadow: `0 0 22px ${accent}25`,
          }}>
          <span className="text-sm">{cfg?.emoji ?? '😊'}</span>
          <span className="text-xs font-mono tracking-wider" style={{ color: accent }}>
            {cfg?.label ?? 'Happy'} mode
          </span>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="relative z-10 flex flex-col items-center gap-0 w-full">

        {/* Bot */}
        <div className="relative">
          {/* Platform glow under bot */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-40 h-8 rounded-full pointer-events-none"
            style={{ background: `radial-gradient(ellipse, ${accent}22 0%, transparent 70%)` }} />
          <BongBotHero onPersonalityChange={handlePersonality} />
        </div>

        {/* Copy block */}
        <div className="text-center px-6 -mt-2">
          <h1 className="font-extrabold text-3xl sm:text-4xl text-white tracking-tight leading-tight mb-3"
            style={{ textShadow: '0 2px 28px rgba(0,0,0,0.8)' }}>
            Meet <span style={{ color: accent }}>Bong Bot</span>
          </h1>
          <p className="text-white/35 text-sm sm:text-base font-light max-w-xs mx-auto leading-relaxed">
            Your agentic file-sharing companion.<br />
            <span className="text-white/20">Sips chai. Waves hello. Watches you back.</span>
          </p>
        </div>
      </div>

      {/* ── Personality state indicators ── */}
      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3">
        {(['happy','excited','thinking','sleepy','sipping'] as Personality[]).map(p => {
          const colours: Record<Personality, string> = {
            happy: '#f0c12c', excited: '#ff7f3b', thinking: '#7bb8f0', sleepy: '#9b8fe0', sipping: '#ff9a3c',
          };
          const emojis: Record<Personality, string> = {
            happy: '😊', excited: '🤩', thinking: '🤔', sleepy: '😴', sipping: '☕',
          };
          const active = personality === p;
          return (
            <div key={p} title={p}
              className="flex flex-col items-center gap-1 transition-all duration-500"
              style={{ opacity: active ? 1 : 0.22, transform: active ? 'scale(1.25)' : 'scale(1)' }}>
              <div className="text-base leading-none">{emojis[p]}</div>
              <div className="w-1 h-1 rounded-full"
                style={{ background: active ? colours[p] : 'white', boxShadow: active ? `0 0 8px ${colours[p]}` : 'none' }} />
            </div>
          );
        })}
      </div>

      {/* ── Footer status ── */}
      <footer className="absolute bottom-0 left-0 right-0 z-20 flex flex-wrap items-center justify-center gap-5 px-6 py-3 border-t"
        style={{ borderColor: 'rgba(255,255,255,0.05)', background: 'linear-gradient(transparent, rgba(0,0,0,0.5))' }}>
        {[
          { colour: '#4ade80', label: 'SVG · Zero .glb files' },
          { colour: accent,    label: 'Eye tracking + Gaze bias' },
          { colour: '#c084fc', label: '5 Personality States' },
        ].map(({ colour, label }) => (
          <div key={label} className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: colour }} />
            <span className="text-white/25 text-[10px] font-mono uppercase tracking-[0.22em]">{label}</span>
          </div>
        ))}
      </footer>
    </div>
  );
}
