import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useI18n } from '@/lib/i18n/context';

type Theme = 'light' | 'dark';

const STORAGE_KEY = 'caw-bv-theme-v2';

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === 'dark') root.classList.add('dark');
  else root.classList.remove('dark');
}

function readTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';
  return window.localStorage.getItem(STORAGE_KEY) === 'light' ? 'light' : 'dark';
}

export function ThemeToggle() {
  const { s } = useI18n();
  const [theme, setTheme] = useState<Theme>(() => readTheme());

  useEffect(() => {
    applyTheme(theme);
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // ignore quota / private mode errors
    }
  }, [theme]);

  const toggle = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === 'dark' ? s.theme.switchToLight : s.theme.switchToDark}
      className="size-8 rounded-md brand-tile flex items-center justify-center transition-colors cursor-pointer"
    >
      {theme === 'dark' ? (
        <Sun className="size-3.5 text-primary" strokeWidth={1.75} />
      ) : (
        <Moon className="size-3.5 text-primary" strokeWidth={1.75} />
      )}
    </button>
  );
}
