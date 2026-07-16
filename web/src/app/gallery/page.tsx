// Author: Robert Massey | Created: 2026-07-13 | Module: Web / Public Gallery
// Purpose: /gallery — the unauthenticated template gallery. SEO/acquisition
// surface with interactive search, industry, category, and capability filters.

import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Suspense } from 'react';

import { Loader2 } from 'lucide-react';

import { PublicGalleryBrowser } from '@/components/library/public-gallery-browser';
import { BRAND } from '@/lib/brand';

export const metadata: Metadata = {
  title: 'Form Template Gallery — Attune Smart Forms',
  description:
    'Free form templates for small businesses: inspections, client intake, HR, field service, events, and more. Filter by industry, search by keyword, and clone one to go live in minutes.',
};

export default function GalleryPage(): React.ReactElement {
  return (
    <div className="min-h-screen bg-muted/40">
      <header className="border-b bg-background">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/">
            <Image
              src={BRAND.logoDark}
              alt={BRAND.appName}
              width={150}
              height={30}
              className="object-contain"
              style={{ height: 'auto' }}
              unoptimized
              priority
            />
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/login" className="px-3 py-1.5 text-sm font-medium hover:underline">
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-md bg-[var(--brand-primary,#F97316)] px-3.5 py-1.5 text-sm font-medium text-white hover:opacity-90"
            >
              Start free trial
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-8 px-4 py-10">
        <div className="max-w-2xl space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Template gallery</h1>
          <p className="text-sm text-muted-foreground">
            Proven forms for small businesses — search by keyword, filter by industry or category,
            and clone a template with optional PDF document mapping and automation.
          </p>
        </div>

        <Suspense
          fallback={
            <div className="flex items-center justify-center rounded-lg border bg-background p-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          }
        >
          <PublicGalleryBrowser />
        </Suspense>
      </main>
    </div>
  );
}
