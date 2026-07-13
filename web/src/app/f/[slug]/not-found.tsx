// Author: Robert Massey | Created: 2026-07-13 | Module: Web / Public Form Fill
// Purpose: 404 for /f/[slug] — shown for unknown slugs, unpublished forms, and
// read-only orgs alike. Deliberately vague: the slug is the capability.

import Link from 'next/link';

import { BRAND } from '@/lib/brand';

export default function PublicFormNotFound(): React.ReactElement {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <div className="w-full max-w-md rounded-2xl border border-border/60 bg-background p-10 text-center shadow-sm">
        <p className="text-5xl font-bold" style={{ color: BRAND.primary }}>
          404
        </p>
        <h1 className="mt-3 text-lg font-semibold text-foreground">
          This form isn&apos;t available
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          It may have been unpublished or the link may be incorrect. If someone sent you this link,
          ask them for an updated one.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block text-sm font-medium text-primary underline underline-offset-2"
        >
          {BRAND.appName}
        </Link>
      </div>
    </div>
  );
}
