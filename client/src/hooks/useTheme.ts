import { useState, useEffect } from 'react';

export type ThemeMode = 'light' | 'dark' | 'auto';

export function useTheme() {
  const [mode, setMode] = useState<ThemeMode>('auto');
  const [resolved, setResolved] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    const savedMode = localStorage.getItem('theme-mode') as ThemeMode;
    if (savedMode) {
      setMode(savedMode);
    }
  }, []);

  useEffect(() => {
    const updateResolvedTheme = () => {
      if (mode === 'auto') {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        setResolved(mediaQuery.matches ? 'dark' : 'light');
        
        const handler = (e: MediaQueryListEvent) => {
          setResolved(e.matches ? 'dark' : 'light');
        };
        
        mediaQuery.addEventListener('change', handler);
        return () => mediaQuery.removeEventListener('change', handler);
      } else {
        setResolved(mode as 'light' | 'dark');
      }
    };

    updateResolvedTheme();
  }, [mode]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', resolved);
    document.documentElement.classList.toggle('dark', resolved === 'dark');
  }, [resolved]);

  const cycleMode = () => {
    const modes: ThemeMode[] = ['light', 'dark', 'auto'];
    const currentIndex = modes.indexOf(mode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    setMode(nextMode);
    localStorage.setItem('theme-mode', nextMode);
  };

  return {
    mode,
    resolved,
    setMode,
    cycleMode
  };
}