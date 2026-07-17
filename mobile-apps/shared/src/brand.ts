// Author: Robert Massey | Created: 2026-07-16 | Module: @attune-sb/mobile-shared
// Purpose: Single source of brand constants for mobile. Mirror web/src/lib/brand.ts
// — never hardcode #F97316 in screen components.

export const MOBILE_BRAND = {
  appName: 'Attune Smart Forms',
  companyName: 'Attune IT LLC',
  copyright: `© ${new Date().getFullYear()} Attune IT LLC. All rights reserved.`,

  primary: '#F97316',
  primaryDark: '#EA580C',
  primaryMid: '#C2410C',
  primaryDeep: '#9A3412',
  accentGreen: '#4ade80',
  accentGreenDeep: '#00A550',

  splashBackground: '#EA580C',
  notificationColor: '#F97316',

  /** Adaptive icon / splash fallback when not using orange splash image */
  adaptiveIconBackground: '#FFFFFF',
} as const;
