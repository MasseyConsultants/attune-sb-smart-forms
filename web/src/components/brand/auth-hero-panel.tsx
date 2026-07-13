// Author: Robert Massey | Created: 2026-07-12 | Module: Web / Brand
// Purpose: Shared left-column hero for ALL auth pages (login, signup, forgot/reset
// password, accept-invite) — orange gradient + geometric decorations + feature list.
// The enterprise edition only branded login; here every auth page gets the same
// treatment per MASTER_PLAN §6a.

import Image from 'next/image';
import { Shield, CheckCircle } from 'lucide-react';

import { BRAND } from '@/lib/brand';
import { DecorativeBackground } from './decorative-background';
import { DecorativeSeparator } from './decorative-separator';

export interface AuthHeroFeature {
  readonly title: string;
  readonly desc: string;
}

const DEFAULT_FEATURES: ReadonlyArray<AuthHeroFeature> = [
  {
    title: 'Drag-and-Drop Form Builder',
    desc: '30 field types, conditional logic, and live preview — no code required',
  },
  {
    title: 'Fill Your Own PDFs',
    desc: 'Upload the forms you already use and map fields onto them visually',
  },
  {
    title: 'Automate the Busywork',
    desc: 'On submission: generate the document, email it, collect approvals',
  },
];

export interface AuthHeroPanelProps {
  readonly title?: string;
  readonly subtitle?: string;
  readonly badgeText?: string;
  readonly features?: ReadonlyArray<AuthHeroFeature>;
}

export function AuthHeroPanel({
  title = BRAND.appName,
  subtitle = 'Forms, documents, and workflows for small businesses — in one place.',
  badgeText = 'Secure Sign-in',
  features = DEFAULT_FEATURES,
}: AuthHeroPanelProps): React.ReactElement {
  return (
    <div
      className="relative hidden flex-col overflow-hidden p-12 text-white lg:flex"
      style={{ background: BRAND.heroGradient }}
    >
      <DecorativeBackground />

      {/* Glass morphism badge, top-right */}
      <div
        className="absolute right-8 top-8 z-10 flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium"
        style={{
          background: 'rgba(255,255,255,0.10)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.20)',
        }}
      >
        <Shield className="h-4 w-4" style={{ color: BRAND.accentGreen }} />
        {badgeText}
      </div>

      {/* Main content — centered vertically */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-6">
        <Image
          src={BRAND.logo}
          alt={BRAND.appName}
          width={320}
          height={80}
          className="object-contain drop-shadow-xl"
          style={{ height: 'auto' }}
          unoptimized
          priority
        />

        <DecorativeSeparator />

        <div className="space-y-3 text-center">
          <h1 className="text-4xl font-bold">{title}</h1>
          <p className="mx-auto max-w-sm text-lg leading-relaxed text-white/90">{subtitle}</p>
        </div>

        <DecorativeSeparator larger />

        <div className="w-full max-w-sm space-y-4">
          {features.map((f) => (
            <div key={f.title} className="flex items-start gap-3">
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                style={{
                  background: 'rgba(255,255,255,0.10)',
                  backdropFilter: 'blur(4px)',
                  border: '1px solid rgba(255,255,255,0.20)',
                }}
              >
                <CheckCircle className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-semibold leading-tight">{f.title}</p>
                <p className="mt-0.5 text-sm leading-snug text-white/90">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom separator + footer */}
      <div className="relative z-10 space-y-4">
        <div className="flex items-center gap-2">
          <div
            className="h-px flex-1"
            style={{ background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.30))' }}
          />
          <span className="h-1.5 w-1.5 rounded-full bg-white/40" />
          <span className="h-1.5 w-1.5 rounded-full bg-white/60" />
          <span className="h-1.5 w-1.5 rounded-full bg-white/80" />
          <div
            className="h-px flex-1"
            style={{ background: 'linear-gradient(to left, transparent, rgba(255,255,255,0.30))' }}
          />
        </div>
        <p className="text-center text-sm text-white/80">{BRAND.copyright}</p>
      </div>
    </div>
  );
}
