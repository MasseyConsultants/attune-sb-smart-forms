// Author: Robert Massey | Created: 2026-07-12 | Module: Web / Legal Layout
// Purpose: Branded shell for /privacy, /terms, and /refund-policy — orange header
// strip with the logo, readable prose column, footer. These pages are REQUIRED and
// public (a self-serve SaaS taking card payments cannot 404 its privacy policy).

import Image from 'next/image';
import Link from 'next/link';

import { BRAND } from '@/lib/brand';

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="text-white" style={{ background: BRAND.heroGradient }}>
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
          <Link href="/" className="flex items-center">
            <Image
              src={BRAND.logo}
              alt={BRAND.appName}
              width={180}
              height={36}
              className="object-contain"
              style={{ height: 'auto' }}
              unoptimized
              priority
            />
          </Link>
          <nav className="flex gap-5 text-sm font-medium text-white/90">
            <Link href="/privacy" className="transition-colors hover:text-white">
              Privacy
            </Link>
            <Link href="/terms" className="transition-colors hover:text-white">
              Terms
            </Link>
            <Link href="/refund-policy" className="transition-colors hover:text-white">
              Refunds
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <article className="prose-sm rounded-2xl border border-gray-200 bg-white p-8 leading-relaxed text-gray-700 shadow-sm sm:p-10 [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:text-gray-900 [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-gray-900 [&_p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-6">
          {children}
        </article>
      </main>

      <footer className="border-t border-gray-200 bg-white py-6">
        <p className="text-center text-sm text-gray-500">{BRAND.copyright}</p>
      </footer>
    </div>
  );
}
