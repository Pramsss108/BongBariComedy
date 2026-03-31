import { useState, useEffect } from 'react';
import BongBotHero from '@/components/BongBotHero';

export default function BotDemo() {
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handler = (e: MouseEvent) => setCursorPos({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', handler);
    return () => window.removeEventListener('mousemove', handler);
  }, []);

  return (
    <div className="fixed inset-0 bg-[#0c0c0e] overflow-hidden flex flex-col items-center justify-center select-none">
      {/* Cursor radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(circle at ${cursorPos.x}px ${cursorPos.y}px, rgba(240,193,44,0.07) 0%, transparent 45%)`,
        }}
      />

      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 py-4">
        <a href="/" className="text-white/50 hover:text-white text-sm transition-colors font-mono">
          ← Back
        </a>
        <h1 className="text-[#f0c12c]/80 text-xs font-mono tracking-[0.3em] uppercase">
          Bong Bot — Interactive Demo
        </h1>
        <div className="text-white/30 text-xs font-mono">Move your mouse</div>
      </header>

      {/* 3D Bot Canvas */}
      <div className="relative z-10 flex flex-col items-center gap-6">
        <BongBotHero />

        {/* Tagline */}
        <div className="text-center px-4">
          <h2 className="text-white font-bold text-2xl sm:text-3xl mb-2 tracking-tight">
            Send files instantly.
          </h2>
          <p className="text-white/40 text-sm">
            Eyes follow cursor · Left hand waves · Right hand drinks chai every ~12s
          </p>
        </div>
      </div>

      {/* Status bar */}
      <footer className="absolute bottom-0 left-0 right-0 z-20 flex flex-wrap items-center justify-center gap-6 px-6 py-4 border-t border-white/5 bg-black/30 backdrop-blur-sm">
        {[
          { color: 'bg-green-400', label: '3D via Three.js' },
          { color: 'bg-yellow-400', label: 'Eye tracking + Drink anim' },
          { color: 'bg-purple-400', label: 'Zero .glb files' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${color} animate-pulse`} />
            <span className="text-white/40 text-xs font-mono uppercase tracking-widest">{label}</span>
          </div>
        ))}
      </footer>
    </div>
  );
}
