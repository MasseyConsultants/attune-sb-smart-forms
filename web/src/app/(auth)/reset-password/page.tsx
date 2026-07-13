// Author: Robert Massey | Created: 2026-07-12 | Module: Web / Auth
// Purpose: Reset-password page — consumes the emailed token, sets a new password.
// Branded with the same two-column treatment as all auth pages.

'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle, KeyRound } from 'lucide-react';

import { BRAND } from '@/lib/brand';
import { AuthShell } from '@/components/brand/auth-shell';
import { cn } from '@/lib/utils';

const schema = z
  .object({
    newPassword: z
      .string()
      .min(12, 'Password must be at least 12 characters')
      .max(128, 'Password must be at most 128 characters'),
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type FormValues = z.infer<typeof schema>;

const HERO = { badgeText: 'Account Recovery' };

export default function ResetPasswordPage(): React.ReactElement {
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
      <ResetPasswordContent />
    </Suspense>
  );
}

function ResetPasswordContent(): React.ReactElement {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  const onSubmit = async (values: FormValues): Promise<void> => {
    setError(null);
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: values.newPassword }),
      });
      const data = (await res.json()) as {
        success: boolean;
        error?: { message: string };
      };
      if (!res.ok || !data.success) {
        setError(data.error?.message ?? 'Reset failed — the link may have expired.');
        return;
      }
      setDone(true);
    } catch {
      setError('Network error — please try again');
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <AuthShell hero={HERO}>
        <div className="space-y-5 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
            <AlertCircle className="h-7 w-7 text-red-600" />
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-gray-900">Invalid reset link</h2>
            <p className="text-sm text-gray-600">
              This link is missing its token. Request a new one from the forgot-password page.
            </p>
          </div>
          <Link
            href="/forgot-password"
            className="text-sm font-medium transition-opacity hover:opacity-75"
            style={{ color: BRAND.primary }}
          >
            Request a new link
          </Link>
        </div>
      </AuthShell>
    );
  }

  if (done) {
    return (
      <AuthShell hero={HERO}>
        <div className="space-y-5 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-50">
            <CheckCircle className="h-7 w-7 text-green-600" />
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-gray-900">Password updated</h2>
            <p className="text-sm text-gray-600">
              Your password has been changed. Sign in with your new password.
            </p>
          </div>
          <Link
            href="/login"
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg font-semibold text-white transition-all hover:shadow-[0_8px_24px_rgba(249,115,22,0.30)]"
            style={{ background: BRAND.ctaGradient }}
          >
            Go to sign in
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell hero={HERO}>
      <div className="mb-6 space-y-1">
        <h2 className="text-3xl font-bold text-gray-900">Choose a new password</h2>
        <p className="text-gray-600">Minimum 12 characters</p>
      </div>

      {error && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        <div className="space-y-1.5">
          <label htmlFor="newPassword" className="text-sm font-medium text-gray-700">
            New password <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              id="newPassword"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              autoFocus
              placeholder="At least 12 characters"
              disabled={isLoading}
              {...register('newPassword')}
              className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 pr-11 text-sm outline-none transition-colors focus:border-orange-500 disabled:cursor-not-allowed disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              tabIndex={-1}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 transition-colors hover:text-gray-700"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.newPassword && (
            <p className="text-xs text-red-600">{errors.newPassword.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
            Confirm password <span className="text-red-500">*</span>
          </label>
          <input
            id="confirmPassword"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="Repeat the password"
            disabled={isLoading}
            {...register('confirmPassword')}
            className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none transition-colors focus:border-orange-500 disabled:cursor-not-allowed disabled:opacity-50"
          />
          {errors.confirmPassword && (
            <p className="text-xs text-red-600">{errors.confirmPassword.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className={cn(
            'flex h-11 w-full items-center justify-center gap-2 rounded-lg font-semibold text-white transition-all hover:shadow-[0_8px_24px_rgba(249,115,22,0.30)]',
            isLoading && 'cursor-not-allowed opacity-50',
          )}
          style={{ background: BRAND.ctaGradient }}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" /> Updating…
            </>
          ) : (
            <>
              <KeyRound className="h-5 w-5" /> Set new password
            </>
          )}
        </button>
      </form>
    </AuthShell>
  );
}
