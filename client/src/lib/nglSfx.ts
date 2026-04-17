/**
 * Minimal Web Audio "synth" — zero-dep, no MP3 download, instant play.
 * Used by NglDashboard for: new-message ping, dice pop, send whoosh.
 * Respects `prefers-reduced-motion` and a simple localStorage mute flag.
 *
 * Silent-safe: if AudioContext isn't available or user muted, every call is a no-op.
 */

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!ctx) {
      const W = window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
      const AC = W.AudioContext || W.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    // iOS sometimes suspends — try to resume silently
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  } catch {
    return null;
  }
}

function isMuted(): boolean {
  try {
    if (typeof window === 'undefined') return true;
    if (localStorage.getItem('bong_ngl_mute') === '1') return true;
    // Respect reduced motion as a hint for reduced audio
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return true;
    return false;
  } catch {
    return false;
  }
}

export function setNglMuted(muted: boolean) {
  try { localStorage.setItem('bong_ngl_mute', muted ? '1' : '0'); } catch {}
}

export function getNglMuted(): boolean {
  try { return localStorage.getItem('bong_ngl_mute') === '1'; } catch { return false; }
}

type ToneOpts = { freq: number; duration: number; type?: OscillatorType; volume?: number; attack?: number; release?: number };

function playTone(opts: ToneOpts) {
  if (isMuted()) return;
  const c = getCtx();
  if (!c) return;
  const now = c.currentTime;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = opts.type || 'sine';
  osc.frequency.setValueAtTime(opts.freq, now);
  const vol = Math.max(0, Math.min(0.25, opts.volume ?? 0.12));
  const attack = opts.attack ?? 0.005;
  const release = opts.release ?? 0.05;
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(vol, now + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + opts.duration + release);
  osc.connect(gain).connect(c.destination);
  osc.start(now);
  osc.stop(now + opts.duration + release + 0.02);
}

/** Soft two-note ping when a new NGL message arrives. */
export function sfxNewMessage() {
  playTone({ freq: 880, duration: 0.08, type: 'sine', volume: 0.10 });
  setTimeout(() => playTone({ freq: 1320, duration: 0.10, type: 'sine', volume: 0.09 }), 60);
}

/** Short pop when the dice rolls to a new prompt. */
export function sfxDicePop() {
  playTone({ freq: 520, duration: 0.06, type: 'triangle', volume: 0.10 });
}

/** Whoosh when a message is sent. */
export function sfxWhoosh() {
  const c = getCtx();
  if (!c || isMuted()) return;
  const now = c.currentTime;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(800, now);
  osc.frequency.exponentialRampToValueAtTime(120, now + 0.22);
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.08, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
  osc.connect(gain).connect(c.destination);
  osc.start(now);
  osc.stop(now + 0.28);
}

/** Light tap for reaction toggle. */
export function sfxTap() {
  playTone({ freq: 660, duration: 0.04, type: 'sine', volume: 0.07 });
}
