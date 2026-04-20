/**
 * NglStitchPreview — Pixel-perfect coded import of the Stitch design.
 * Project: 12494298028177117085
 * Source HTML: docs/stitch/f9cbc435292c4fa19d60ae34b361f10b.html
 * (Generated from screen 97ffb1fc58864c3fa5b569c3792befcc — Bong Bari Premium Home Dashboard V1)
 *
 * STANDALONE preview page. Buttons render visually but are NON-functional (no handlers).
 * Route: /ngl/stitch-preview
 */
import { useEffect } from 'react';

const STITCH_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&family=Inter:wght@400;500;600&family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');

  .stitch-root {
    background: radial-gradient(circle at center, #1a1a24 0%, #050508 100%);
    color: #f5f0e6;
    font-family: 'Inter', sans-serif;
    min-height: 100vh;
    width: 100%;
    overflow-x: hidden;
  }
  .stitch-root .glass-panel {
    background: rgba(255,255,255,0.04);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 0.5px solid rgba(212,165,116,0.15);
  }
  .stitch-root .gold-gradient-bg {
    background: linear-gradient(45deg, #fef3c7, #f4c430, #b8860b, #f4c430, #fef3c7);
  }
  .stitch-root .gold-text-gradient {
    background: linear-gradient(45deg, #fef3c7, #f4c430, #b8860b);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    color: transparent;
  }
  .stitch-root .ambient-gold-shadow {
    box-shadow: 0 20px 40px rgba(184, 134, 11, 0.08);
  }
  .stitch-root .material-symbols-outlined {
    font-family: 'Material Symbols Outlined';
    font-weight: normal;
    font-style: normal;
    font-size: 24px;
    line-height: 1;
    letter-spacing: normal;
    text-transform: none;
    display: inline-block;
    white-space: nowrap;
    word-wrap: normal;
    direction: ltr;
    font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
  }
  .stitch-root .font-headline { font-family: 'Manrope', sans-serif; }

  .stitch-root .text-on-surface { color: #e4e1f0; }
  .stitch-root .text-on-surface-variant { color: #d1c5ad; }
  .stitch-root .text-primary { color: #ffe3a1; }
  .stitch-root .text-primary-container { color: #f4c430; }
  .stitch-root .text-on-primary-fixed { color: #241a00; }
  .stitch-root .text-error { color: #ffb4ab; }
  .stitch-root .bg-surface-container { background: #1f1f29; }
  .stitch-root .bg-surface-container-highest { background: #34343f; }
  .stitch-root .border-primary-container { border-color: #f4c430; }

  .stitch-root input::placeholder { color: rgba(245,240,230,0.3); }
  .stitch-root input:focus { outline: none; box-shadow: 0 0 0 1px #f4c430; }
`;

export default function NglStitchPreview() {
  useEffect(() => {
    const id = 'stitch-preview-styles';
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = STITCH_CSS;
    document.head.appendChild(style);
  }, []);

  return (
    <div className="stitch-root flex flex-col items-center">
      {/* TopAppBar */}
      <header className="w-full flex justify-between items-center px-6 py-4 z-50">
        <button
          type="button"
          className="w-10 h-10 flex items-center justify-center rounded-full glass-panel active:scale-95 transition-transform"
        >
          <span className="material-symbols-outlined text-on-surface">arrow_back</span>
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-primary-container overflow-hidden flex items-center justify-center bg-surface-container">
            <span className="font-headline font-bold text-lg text-primary">T</span>
          </div>
          <span className="font-headline font-bold tracking-tight text-on-surface">@the_sovereign</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="px-3 py-1.5 rounded-full glass-panel text-xs font-semibold text-primary uppercase tracking-widest"
          >
            EN
          </button>
          <button
            type="button"
            className="w-10 h-10 flex items-center justify-center rounded-full glass-panel text-error active:scale-95 transition-transform"
          >
            <span className="material-symbols-outlined">logout</span>
          </button>
        </div>
      </header>

      <main className="w-full max-w-md px-6 flex flex-col gap-5 flex-1 pb-8">
        {/* Tab Switcher */}
        <div className="glass-panel rounded-full p-1 flex items-center gap-1">
          <button
            type="button"
            className="flex-1 py-2.5 rounded-full gold-gradient-bg text-on-primary-fixed font-bold text-sm"
          >
            Home
          </button>
          <button
            type="button"
            className="flex-1 py-2.5 rounded-full text-on-surface-variant font-medium text-sm"
          >
            Inbox
          </button>
        </div>

        {/* PRO Hero Card */}
        <div className="relative group">
          <div className="absolute -inset-0.5 gold-gradient-bg rounded-2xl blur opacity-20 group-hover:opacity-30 transition duration-1000" />
          <div className="relative glass-panel rounded-2xl p-5 flex items-center justify-between overflow-hidden ambient-gold-shadow">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full gold-gradient-bg p-0.5">
                <div className="w-full h-full rounded-full bg-surface-container flex items-center justify-center">
                  <span className="font-headline font-extrabold text-2xl gold-text-gradient">T</span>
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-headline font-bold text-lg text-on-surface">@the_sovereign</h2>
                  <span className="text-[10px] gold-gradient-bg text-on-primary-fixed font-black px-1.5 py-0.5 rounded-sm uppercase tracking-tighter">
                    PRO
                  </span>
                </div>
                <p className="text-sm" style={{ color: 'rgba(212,165,116,0.6)' }}>
                  Membership Active
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-medium" style={{ color: 'rgba(212,165,116,0.6)' }}>
                Billed Monthly
              </p>
              <p className="text-xl font-headline font-black text-primary">
                ₹99<span className="text-xs">/mo</span>
              </p>
            </div>
          </div>
        </div>

        {/* "What people see" Card */}
        <div className="glass-panel rounded-2xl p-6 flex flex-col gap-4 ambient-gold-shadow">
          <div className="flex justify-between items-center">
            <span
              className="text-[10px] uppercase font-bold"
              style={{ letterSpacing: '0.2em', color: 'rgba(212,165,116,0.6)' }}
            >
              Public Display
            </span>
            <span
              className="material-symbols-outlined text-primary text-sm"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              visibility
            </span>
          </div>
          <p className="font-headline text-2xl font-semibold leading-tight text-on-surface">
            Send me anonymous questions about our investment portfolio!
          </p>
          <div className="flex gap-2 mt-2">
            <button
              type="button"
              className="flex-1 py-3 rounded-full glass-panel flex items-center justify-center gap-2 text-sm font-semibold active:scale-95 transition-transform"
            >
              <span className="material-symbols-outlined text-sm">shuffle</span> Shuffle
            </button>
            <button
              type="button"
              className="flex-1 py-3 rounded-full glass-panel flex items-center justify-center gap-2 text-sm font-semibold active:scale-95 transition-transform"
            >
              <span className="material-symbols-outlined text-sm">edit</span> Edit Text
            </button>
          </div>
        </div>

        {/* Verify WhatsApp */}
        <div className="glass-panel rounded-2xl p-4 flex flex-col gap-3">
          <label
            className="text-[10px] uppercase font-bold tracking-widest ml-2"
            style={{ color: 'rgba(212,165,116,0.6)' }}
          >
            Verify Secure Channel
          </label>
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="+91 98765 43210"
                className="w-full bg-surface-container-highest border-none rounded-full py-3.5 pl-5 pr-12 text-on-surface text-sm"
                readOnly
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-primary-container"
              >
                <span className="material-symbols-outlined">mic</span>
              </button>
            </div>
            <button
              type="button"
              className="gold-gradient-bg text-on-primary-fixed px-6 py-3.5 rounded-full font-bold text-sm shadow-lg active:scale-95 transition-transform"
            >
              Submit
            </button>
          </div>
          <div className="flex items-center gap-2 ml-2">
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: '#10b981', boxShadow: '0 0 8px rgba(16,185,129,0.6)' }}
            />
            <p className="text-[10px] font-medium" style={{ color: 'rgba(209,197,173,0.6)' }}>
              System encrypted &amp; ready for encrypted delivery.
            </p>
          </div>
        </div>

        {/* Link Bar */}
        <div className="glass-panel rounded-full p-2 flex items-center justify-between ambient-gold-shadow">
          <span
            className="ml-4 text-xs font-medium text-on-surface-variant"
            style={{ fontFamily: 'monospace' }}
          >
            bongbari.com/ngl/q/the_sovereign
          </span>
          <button
            type="button"
            className="gold-gradient-bg text-on-primary-fixed px-5 py-2 rounded-full font-black text-xs uppercase tracking-widest active:scale-95 transition-transform"
          >
            Copy
          </button>
        </div>

        {/* Share Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {/* WhatsApp */}
          <div className="glass-panel rounded-2xl p-4 flex flex-col items-center gap-3 active:scale-95 transition-transform cursor-pointer group">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform"
              style={{ background: 'rgba(16,185,129,0.2)' }}
            >
              <span className="material-symbols-outlined" style={{ color: '#10b981' }}>chat</span>
            </div>
            <span
              className="text-xs font-bold uppercase tracking-widest"
              style={{ color: '#34d399' }}
            >
              WhatsApp
            </span>
          </div>

          {/* IG Story */}
          <div className="glass-panel rounded-2xl p-4 flex flex-col items-center gap-3 active:scale-95 transition-transform cursor-pointer group">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform"
              style={{
                background: 'linear-gradient(to top right, #facc15, #ec4899, #9333ea)',
              }}
            >
              <span className="material-symbols-outlined" style={{ color: '#fff' }}>
                photo_camera
              </span>
            </div>
            <span
              className="text-xs font-bold uppercase tracking-widest"
              style={{ color: '#f472b6' }}
            >
              IG Story
            </span>
          </div>

          {/* Story Card */}
          <div className="glass-panel rounded-2xl p-4 flex flex-col items-center gap-3 active:scale-95 transition-transform cursor-pointer group">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform"
              style={{ background: 'rgba(99,102,241,0.2)' }}
            >
              <span className="material-symbols-outlined text-3xl" style={{ color: '#818cf8' }}>
                style
              </span>
            </div>
            <span
              className="text-xs font-bold uppercase tracking-widest"
              style={{ color: '#818cf8' }}
            >
              Story Card
            </span>
          </div>

          {/* More */}
          <div className="glass-panel rounded-2xl p-4 flex flex-col items-center gap-3 active:scale-95 transition-transform cursor-pointer group">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform"
              style={{ background: 'rgba(255,255,255,0.1)' }}
            >
              <span className="material-symbols-outlined text-on-surface text-3xl">
                more_horiz
              </span>
            </div>
            <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
              More
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
