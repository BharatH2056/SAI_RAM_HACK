// src/theme/ThemeContext.jsx - Theme state management with screen smart defaults
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

const ThemeContext = createContext({
  theme: 'dark',
  toggleTheme: () => {},
  setTheme: () => {},
  applyScreenDefault: () => {},
});

const STORAGE_KEY = 'goldenhour_theme_pref';

export function ThemeProvider({ children }) {
  // Check if user has explicitly saved a preference
  const [theme, setThemeState] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
    // Auto-detect device preference on first load
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light';
    }
    return 'dark';
  });

  const [userExplicitlySet, setUserExplicitlySet] = useState(() => {
    return Boolean(localStorage.getItem(STORAGE_KEY));
  });

  // Keep DOM attribute synchronized
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const setTheme = useCallback((newTheme) => {
    setThemeState(newTheme);
    setUserExplicitlySet(true);
    localStorage.setItem(STORAGE_KEY, newTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, [setTheme]);

  /**
   * Called by screens to propose smart defaults if the user hasn't explicitly locked in a theme.
   * Dispatcher = dark, Hospital = light, Landing = dark, Driver/SOS = follow device
   */
  const applyScreenDefault = useCallback((defaultSuggestion) => {
    const userPref = localStorage.getItem(STORAGE_KEY);
    if (!userPref && defaultSuggestion) {
      setThemeState(defaultSuggestion);
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, applyScreenDefault }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export default useTheme;
