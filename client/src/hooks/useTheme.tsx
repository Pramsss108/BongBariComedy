import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type ThemeMode = 'light' | 'dark' | 'auto';

interface ThemeContextValue {
  mode: ThemeMode;          // persisted user preference (or 'auto')
  resolved: 'light' | 'dark'; // actual applied theme after resolving system preference
  setMode: (m: ThemeMode) => void;
  cycleMode: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const THEME_KEY = 'bbc_theme';
const LEGACY_KEY = 'bbc_dark'; // legacy boolean key to migrate

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function readInitialMode(): ThemeMode {
  if (typeof window === 'undefined') return 'light';
  try {
    const stored = localStorage.getItem(THEME_KEY) as ThemeMode | null;
    if (stored === 'light' || stored === 'dark' || stored === 'auto') return stored;
    // Migration: legacy boolean key
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy === '1') {
      localStorage.setItem(THEME_KEY, 'dark');
      return 'dark';
    }
    if (legacy === '0') {
      localStorage.setItem(THEME_KEY, 'light');
      return 'light';
    }
  } catch {/* ignore */}
  return 'auto';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(() => readInitialMode());
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>(() => getSystemTheme());

  // Listen to system changes if in auto
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => setSystemTheme(mq.matches ? 'dark' : 'light');
    try { mq.addEventListener('change', handler); } catch { mq.addListener(handler); }
    return () => { try { mq.removeEventListener('change', handler); } catch { mq.removeListener(handler); } };
  }, []);

  const resolved: 'light' | 'dark' = mode === 'auto' ? systemTheme : mode;

  // Apply html class & persist preference
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const html = document.documentElement;
    if (resolved === 'dark') html.classList.add('dark'); else html.classList.remove('dark');
  }, [resolved]);

  useEffect(() => {
    try { localStorage.setItem(THEME_KEY, mode); } catch {/* ignore */}
    // Broadcast custom event
    window.dispatchEvent(new CustomEvent('bbc:theme-change', { detail: { mode, resolved } }));
  }, [mode, resolved]);

  // Cross-tab sync
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === THEME_KEY && e.newValue) {
        if (e.newValue === 'light' || e.newValue === 'dark' || e.newValue === 'auto') {
          setMode(e.newValue);
        }
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const setModeSafe = useCallback((m: ThemeMode) => setMode(m), []);
  const cycleMode = useCallback(() => {
    setMode(prev => prev === 'light' ? 'dark' : prev === 'dark' ? 'auto' : 'light');
  }, []);

  const value = useMemo<ThemeContextValue>(() => ({ mode, resolved, setMode: setModeSafe, cycleMode }), [mode, resolved, setModeSafe, cycleMode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
