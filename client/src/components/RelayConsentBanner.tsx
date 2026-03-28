import { useState, useEffect } from 'react';

const CONSENT_KEY = 'bongbari_relay_consent';

export function RelayConsentBanner() {
  const [visible, setVisible] = useState(false);
  const [active, setActive]   = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (stored === 'yes') {
      setActive(true);
      startRelayWorker();
    } else if (!stored) {
      const t = setTimeout(() => setVisible(true), 4000);
      return () => clearTimeout(t);
    }
  }, []);

  function handleEnable() {
    localStorage.setItem(CONSENT_KEY, 'yes');
    setActive(true);
    setVisible(false);
    startRelayWorker();
  }

  function handleSkip() {
    localStorage.setItem(CONSENT_KEY, 'no');
    setVisible(false);
  }

  function handleStop() {
    localStorage.removeItem(CONSENT_KEY);
    setActive(false);
    stopRelayWorker();
  }

  // Active dot — tiny, top-right
  if (active) {
    return (
      <div
        className="fixed top-3 right-3 z-50 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium select-none cursor-pointer"
        style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', color: '#6ee7b7' }}
        onClick={handleStop}
        title="Click to stop"
      >
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
        </span>
        Boosting ✕
      </div>
    );
  }

  if (!visible) return null;

  // Tiny consent pill — bottom-right
  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-3 py-2 rounded-2xl shadow-xl"
      style={{ background: 'rgba(15,23,42,0.93)', border: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(20px)', maxWidth: '240px' }}
    >
      <div className="flex-1">
        <p className="text-[11px] font-semibold text-white/90 leading-tight">⚡ Boost speed. Free.</p>
        <p className="text-[10px] text-white/40 leading-tight mt-0.5">Uses your network briefly.</p>
      </div>
      <div className="flex gap-1">
        <button
          onClick={handleEnable}
          className="px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all duration-200 hover:scale-105 active:scale-95"
          style={{ background: 'linear-gradient(135deg, #f0c12c, #e8a320)', color: '#0f172a' }}
        >
          On
        </button>
        <button
          onClick={handleSkip}
          className="px-2 py-1 rounded-lg text-[11px] text-white/40 hover:text-white/70 transition-colors"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

// ── Relay worker lifecycle ──────────────────────────────────────
// Uses a SharedWorker so only ONE relay is active per browser,
// even across multiple tabs. Falls back to a no-op if unsupported.

let worker: SharedWorker | null = null;

function startRelayWorker() {
  if (!('SharedWorker' in window)) return; // Safari/Firefox private mode fallback
  if (worker) return;
  try {
    worker = new SharedWorker('/relay-worker.js', { name: 'bongbari-relay', type: 'module' });
    worker.port.start();
    worker.port.postMessage({ cmd: 'start' });
  } catch {
    // Non-fatal — relay is opt-in enhancement only
  }
}

function stopRelayWorker() {
  if (!worker) return;
  try {
    worker.port.postMessage({ cmd: 'stop' });
    worker.port.close();
  } catch {}
  worker = null;
}
