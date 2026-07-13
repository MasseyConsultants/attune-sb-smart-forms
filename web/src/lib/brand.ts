// Author: Robert Massey | Created: 2026-07-12 | Module: Web / Brand
// Purpose: THE single source of brand constants for the web app.
// Never hardcode brand colors or logo paths in page components — import from here.
// (The enterprise edition duplicated BRAND_PRIMARY across 8+ files; this fixes that.)

export const BRAND = {
  appName: 'Attune Smart Forms',
  companyName: 'Attune IT LLC',
  copyright: `© ${new Date().getFullYear()} Attune IT LLC. All rights reserved.`,

  // Attune orange palette
  primary: '#F97316',
  primaryDark: '#EA580C',
  primaryMid: '#C2410C',
  primaryDeep: '#9A3412',
  // Logo wordmark accent green
  accentGreen: '#4ade80',
  accentGreenDeep: '#00A550',

  // Auth hero gradient (login/signup left panel)
  heroGradient: 'linear-gradient(135deg, #EA580C 0%, #C2410C 50%, #9A3412 100%)',
  ctaGradient: 'linear-gradient(to right, #F97316, #EA580C)',

  logo: '/attune-logo.svg',
  logoDark: '/attune-logo-dark.svg',
  logoSidebar: '/attune-logo-sidebar.svg',
  icon: '/attune-icon.png',
} as const;
