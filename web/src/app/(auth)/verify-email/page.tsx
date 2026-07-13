// Author: Robert Massey | Created: 2026-07-12 | Module: Web / Auth
// Purpose: Email verification landing page — consumes the emailed token.

'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, CheckCircle } from 'lucide-react';

import { BRAND } from '@/lib/brand';
import { AuthShell } from '@/components/brand/auth-shell';

const HERO = { badgeText: 'Email Verification' };

export default function VerifyEmailPage(): React.ReactElement {
  return (
    <Suspense
      fallback={
        <AuthShell hero={HERO}>
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-r-transparent" />
          </div>
        </AuthShell>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}

type PageState = 'verifying' | 'success' | 'failed';

function VerifyEmailContent(): React.ReactElement {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [state, setState] = useState<PageState>('verifying');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError('This verification link is missing its token.');
      setState('failed');
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch('/api/auth/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        const data = (await res.json()) as { success: boolean; error?: { message: string } };
        if (cancelled) return;
        if (!res.ok || !data.success) {
          setError(data.error?.message ?? 'Verification failed — the link may have expired.');
          setState('failed');
          return;
        }
        setState('success');
      } catch {
        if (!cancelled) {
          setError('Network error — please try again.');
          setState('failed');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <AuthShell hero={HERO}>
      {state === 'verifying' && (
        <div className="flex flex-col items-center gap-4 py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-r-transparent" />
          <p className="text-sm text-gray-600">Verifying your email…</p>
        </div>
      )}

      {state === 'success' && (
        <div className="space-y-5 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-50">
            <CheckCircle className="h-7 w-7 text-green-600" />
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-gray-900">Email verified</h2>
            <p className="text-sm text-gray-600">Your email address has been confirmed.</p>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg font-semibold text-white transition-all hover:shadow-[0_8px_24px_rgba(249,115,22,0.30)]"
            style={{ background: BRAND.ctaGradient }}
          >
            Go to your workspace
          </Link>
        </div>
      )}

      {state === 'failed' && (
        <div className="space-y-5 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
            <AlertCircle className="h-7 w-7 text-red-600" />
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-gray-900">Verification failed</h2>
            <p className="text-sm text-gray-600">{error}</p>
          </div>
          <Link
            href="/login"
            className="text-sm font-medium transition-opacity hover:opacity-75"
            style={{ color: BRAND.primary }}
          >
            Back to sign in
          </Link>
        </div>
      )}
    </AuthShell>
  );
}
