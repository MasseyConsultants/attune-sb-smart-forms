// Author: Robert Massey | Created: 2026-07-12 | Module: Web / Providers
// Purpose: Client-side theme provider syncing data-theme on <html> with the stored
// preference. Ported from enterprise; SMB default theme is 'attune' (brand orange).

'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { type ThemeName, THEME_NAMES } from '@/lib/utils';

const STORAGE_KEY = 'attune-sb-theme';
const DEFAULT_THEME: ThemeName = 'attune';

interface ThemeContextValue {
  readonly theme: ThemeName;
  readonly setTheme: (theme: ThemeName) => void;
  readonly availableThemes: ReadonlyArray<ThemeName>;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export interface ThemeProviderProps {
  readonly children: React.ReactNode;
  readonly initialTheme?: ThemeName;
}

export function ThemeProvider({
  children,
  initialTheme = DEFAULT_THEME,
}: ThemeProviderProps): React.ReactElement {
  const [theme, setThemeState] = useState<ThemeName>(initialTheme);

  // Prefer localStorage over the SSR default so returning users see their
  // preference immediately without a layout shift flash.
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as ThemeName | null;
    if (stored && (THEME_NAMES as ReadonlyArray<string>).includes(stored)) {
      setThemeState(stored);
    }
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const setTheme = useCallback((next: ThemeName): void => {
    setThemeState(next);
    localStorage.setItem(STORAGE_KEY, next);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, availableThemes: THEME_NAMES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used inside <ThemeProvider>');
  }
  return ctx;
}
