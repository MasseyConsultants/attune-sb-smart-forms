// Author: Robert Massey | Created: 2026-07-12 | Module: Web / Utils
// Purpose: cn() utility — merges Tailwind classes and resolves conflicts with tailwind-merge.
// Ported from enterprise admin-portal.

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// --- Theme name type ---
// Keep in sync with the data-theme values defined in globals.css.
export type ThemeName =
  | 'light'
  | 'dark'
  | 'slate'
  | 'ocean'
  | 'forest'
  | 'sunset'
  | 'corporate'
  | 'midnight'
  | 'rose'
  | 'amber'
  | 'violet'
  | 'teal'
  | 'attune';

export const THEME_NAMES: ReadonlyArray<ThemeName> = [
  'attune',
  'light',
  'dark',
  'slate',
  'ocean',
  'forest',
  'sunset',
  'corporate',
  'midnight',
  'rose',
  'amber',
  'violet',
  'teal',
] as const;
