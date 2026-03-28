/**
 * RelayConsentBanner
 * ─────────────────────────────────────────────────────────────
 * Honest, plain-language opt-in to use the visitor's connection
 * as a download/upload relay — exactly like seeding a torrent.
 *
 * What it does when user clicks "Enable":
 *   - A small WebRTC DataChannel node is opened in a SharedWorker
 *   - If another BongBari user needs to pull a file chunk that is
 *     cached in the helper's browser, the relay serves it
 *   - NEVER reads local files or personal data
 *   - Stopped the moment user closes the tab or clicks "Stop Helping"
 *   - Consent is persisted to localStorage so we don't re-ask
 */

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
      // Show banner after 3s delay so it doesn't compete with page load
      const t = setTimeout(() => setVisible(true), 3000);
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

  // ── Active indicator (top-right corner pill when relay is on) ──
  if (active) {
    return (
      <div
        className="fixed top-4 right-4 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium select-none"
        style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.4)', color: '#6ee7b7' }}
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        Relay ON
        <button
          onClick={handleStop}
          className="ml-1 opacity-60 hover:opacity-100 transition-opacity"
          aria-label="Stop relay"
        >
          ✕
        </button>
      </div>
    );
  }

  if (!visible) return null;

  // ── Consent banner ──────────────────────────────────────────
  return (
    <div
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-md rounded-2xl px-5 py-4 shadow-2xl"
      style={{ background: 'rgba(15,23,42,0.92)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(16px)' }}
    >
      <p className="text-sm text-white/90 leading-relaxed mb-3">
        <span className="font-semibold text-[#f0c12c]">Speed up BongBari for everyone</span>
        <br />
        Like seeding a torrent — while you browse, your browser quietly helps
        relay downloads for other users. <strong>No files are read from your device.</strong>{' '}
        You can stop anytime.
      </p>

      <div className="flex gap-2">
        <button
          onClick={handleEnable}
          className="flex-1 rounded-xl py-2 text-sm font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-95"
          style={{ background: 'linear-gradient(135deg, #f0c12c, #e8a320)', color: '#0f172a' }}
        >
          Enable — I'm In ⚡
        </button>
        <button
          onClick={handleSkip}
          className="px-4 rounded-xl py-2 text-sm text-white/50 hover:text-white/80 transition-colors"
          style={{ background: 'rgba(255,255,255,0.05)' }}
        >
          Skip
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
