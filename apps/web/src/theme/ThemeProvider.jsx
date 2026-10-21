import { createContext, useContext, useEffect, useState } from 'react';

const STORAGE_KEY = 'nhpaowa_theme';
const ThemeContext = createContext({
  theme: 'light',
  setTheme: () => {},
  toggleTheme: () => {},
});

const LIGHT_VARS = {
  '--brand': '#8e248d',
  '--brand-soft': '#a832a6',
  '--brand-muted': '#c9a3c8',
  '--sidebar': '#3a0f3a',
  '--sidebar-soft': '#4d1550',
  '--sidebar-muted': '#c9a3c8',
  '--surface': '#f8f5f9',
  '--panel': '#ffffff',
  '--ink': '#1a0f1a',
  '--muted': '#6b5a6b',
  '--line': '#e8dde8',
  '--success': '#16a34a',
  '--warning': '#b45309',
  '--danger': '#b91c1c',
  '--shadow': '#1a0f1a',
  '--chart-tick': '#6b5a6b',
  '--chart-grid': '#e8dde8',
  '--chart-bar': '#8e248d',
  '--input-bg': '#ffffff',
};

const DARK_VARS = {
  '--brand': '#e8a0e4',
  '--brand-soft': '#f0c0ee',
  '--brand-muted': '#a0789e',
  '--sidebar': '#120812',
  '--sidebar-soft': '#241224',
  '--sidebar-muted': '#e2d4e2',
  '--surface': '#100c10',
  '--panel': '#2a1f2a',
  '--ink': '#faf6fa',
  '--muted': '#d4c4d4',
  '--line': '#5a405a',
  '--success': '#86efac',
  '--warning': '#fde68a',
  '--danger': '#fca5a5',
  '--shadow': '#000000',
  '--chart-tick': '#e2d4e2',
  '--chart-grid': '#5a405a',
  '--chart-bar': '#e8a0e4',
  '--input-bg': '#1a121a',
};

function resolveInitial() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    /* ignore */
  }
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

function applyDomTheme(theme) {
  const root = document.documentElement;
  const dark = theme === 'dark';
  root.classList.toggle('dark', dark);
  root.dataset.theme = theme;
  root.style.colorScheme = theme;

  const vars = dark ? DARK_VARS : LIGHT_VARS;
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value);
  }
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    const initial = resolveInitial();
    if (typeof document !== 'undefined') applyDomTheme(initial);
    return initial;
  });

  useEffect(() => {
    applyDomTheme(theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  function setTheme(next) {
    setThemeState(next === 'dark' ? 'dark' : 'light');
  }

  function toggleTheme() {
    setThemeState((t) => (t === 'dark' ? 'light' : 'dark'));
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
