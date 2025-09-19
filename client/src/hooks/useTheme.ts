import { useState, useEffect } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  mode: ThemeMode;
  resolved: 'light' | 'dark';
}

export function useTheme() {
  const [themeState, setThemeState] = useState<ThemeState>({
    mode: 'system',
    resolved: 'light'
  });

  useEffect(() => {
    // Check system preference
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const updateResolvedTheme = () => {
      if (themeState.mode === 'system') {
        setThemeState(prev => ({
          ...prev,
          resolved: mediaQuery.matches ? 'dark' : 'light'
        }));
      }
    };

    // Initial check
    updateResolvedTheme();

    // Listen for changes
    mediaQuery.addEventListener('change', updateResolvedTheme);

    return () => {
      mediaQuery.removeEventListener('change', updateResolvedTheme);
    };
  }, [themeState.mode]);

  const cycleMode = () => {
    setThemeState(prev => {
      const modes: ThemeMode[] = ['light', 'dark', 'system'];
      const currentIndex = modes.indexOf(prev.mode);
      const nextMode = modes[(currentIndex + 1) % modes.length];
      
      return {
        mode: nextMode,
        resolved: nextMode === 'system' 
          ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
          : nextMode === 'dark' ? 'dark' : 'light'
      };
    });
  };

  return {
    mode: themeState.mode,
    resolved: themeState.resolved,
    cycleMode
  };
}
