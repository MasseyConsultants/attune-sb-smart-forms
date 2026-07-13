// Author: Robert Massey | Created: 2026-07-12 | Module: Web / Brand
// Purpose: Two-column branded shell used by ALL auth pages: hero panel on the
// left (desktop), centered card + legal footer on the right. Guarantees the
// consistent treatment MASTER_PLAN §6a requires.

import Image from 'next/image';
import Link from 'next/link';

import { BRAND } from '@/lib/brand';
import { AuthHeroPanel, type AuthHeroPanelProps } from './auth-hero-panel';

export interface AuthShellProps {
  readonly children: React.ReactNode;
  readonly hero?: AuthHeroPanelProps;
  /** Legal consent line under the card; hidden for pages with an explicit consent checkbox */
  readonly showLegalFooter?: boolean;
}

export function AuthShell({
  children,
  hero,
  showLegalFooter = true,
}: AuthShellProps): React.ReactElement {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <AuthHeroPanel {...hero} />

      <div className="flex flex-col items-center justify-center bg-gray-50 p-8">
        {/* Mobile-only logo (hero panel is hidden below lg) */}
        <div className="mb-8 lg:hidden">
          <Image
            src={BRAND.logoDark}
            alt={BRAND.appName}
            width={200}
            height={38}
            className="object-contain"
            style={{ height: 'auto' }}
            unoptimized
            priority
          />
        </div>

        <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-xl">
          {children}
        </div>

        {showLegalFooter && (
          <p className="mt-4 text-center text-sm text-gray-600">
            By continuing, you agree to our{' '}
            <Link
              href="/terms"
              className="font-medium underline-offset-2 hover:underline"
              style={{ color: BRAND.primary }}
            >
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link
              href="/privacy"
              className="font-medium underline-offset-2 hover:underline"
              style={{ color: BRAND.primary }}
            >
              Privacy Policy
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
