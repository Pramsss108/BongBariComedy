// Zero-dep haptic feedback helper
// Uses navigator.vibrate on Android/supported devices; silently no-ops elsewhere.
// iOS Safari does NOT support vibrate API — that's OK, visual feedback carries.
export type HapticStyle = 'tap' | 'success' | 'error' | 'warn' | 'heavy';

const PATTERNS: Record<HapticStyle, number | number[]> = {
  tap: 12,
  success: [18, 40, 30],
  error: [40, 50, 40, 50, 40],
  warn: [25, 30, 25],
  heavy: 35,
};

let enabledCache: boolean | null = null;
function prefersReduced(): boolean {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
}
function enabled(): boolean {
  if (enabledCache !== null) return enabledCache;
  try {
    enabledCache = typeof navigator !== 'undefined' && typeof (navigator as any).vibrate === 'function' && !prefersReduced();
  } catch { enabledCache = false; }
  return enabledCache;
}

export function haptic(style: HapticStyle = 'tap') {
  if (!enabled()) return;
  try { (navigator as any).vibrate(PATTERNS[style]); } catch {}
}

// Hook sugar — same behavior, import-friendly
export function useHaptic() {
  return haptic;
}
