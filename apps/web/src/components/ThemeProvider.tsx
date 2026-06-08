import { useEffect } from 'react';
import { useUIStore } from '../stores/ui.store.js';

const THEME_KEY = 'overleaf-theme-preference';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useUIStore((s) => s.theme);

  // Restore persisted theme on mount
  useEffect(() => {
    const stored = localStorage.getItem(THEME_KEY) as 'light' | 'dark' | 'system' | null;
    if (stored && stored !== theme) useUIStore.getState().setTheme(stored);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    localStorage.setItem(THEME_KEY, theme);

    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
      root.style.colorScheme = 'dark';
    } else if (theme === 'light') {
      root.classList.add('light');
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    } else {
      // System — follow OS preference
      root.classList.remove('light', 'dark');
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      root.classList.toggle('dark', mq.matches);
      root.style.colorScheme = mq.matches ? 'dark' : 'light';
      const handler = (e: MediaQueryListEvent) => {
        root.classList.toggle('dark', e.matches);
        root.style.colorScheme = e.matches ? 'dark' : 'light';
      };
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }
  }, [theme]);

  return <>{children}</>;
}
