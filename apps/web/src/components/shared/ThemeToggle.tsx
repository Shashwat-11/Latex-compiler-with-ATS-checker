import { useUIStore } from '../../stores/ui.store.js';
import { Sun, Moon, Monitor } from 'lucide-react';

const themeCycle = ['light', 'dark', 'system'] as const;

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useUIStore();
  const idx = themeCycle.indexOf(theme);
  const next = themeCycle[(idx + 1) % themeCycle.length];
  const Icon = theme === 'dark' ? Moon : theme === 'system' ? Monitor : Sun;
  return (
    <button
      onClick={() => setTheme(next as 'light' | 'dark' | 'system')}
      className={`rounded-[var(--radius-sm)] p-1.5 text-[var(--text-tertiary)] hover:bg-[var(--bg-overlay)] hover:text-[var(--text-primary)] transition-all duration-[var(--transition-fast)] ${className ?? ''}`}
      title={`Theme: ${theme} — click for ${next}`}
      aria-label={`Switch theme to ${next}`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
