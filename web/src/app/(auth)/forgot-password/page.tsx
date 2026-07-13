// Author: Robert Massey | Created: 2026-07-12 | Module: Web / Auth
// Purpose: Forgot-password page — branded (the enterprise edition left this page
// unbranded; fixed here per MASTER_PLAN §6a). Anti-enumeration: always shows the
// same confirmation regardless of whether the email exists.

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, MailCheck, ArrowLeft, Send } from 'lucide-react';

import { BRAND } from '@/lib/brand';
import { AuthShell } from '@/components/brand/auth-shell';
import { cn } from '@/lib/utils';

const schema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type FormValues = z.infer<typeof schema>;

const HERO = { badgeText: 'Account Recovery' };

export default function ForgotPasswordPage(): React.ReactElement {
  const [sent, setSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
    defaultValues: { email: '' },
  });

  const onSubmit = async (values: FormValues): Promise<void> => {
    setIsLoading(true);
    try {
      await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
    } catch {
      // Uniform UX regardless of outcome — no enumeration, no scary errors.
    } finally {
      setIsLoading(false);
      setSent(true);
    }
  };

  return (
    <AuthShell hero={HERO}>
      {sent ? (
        <div className="space-y-5 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-50">
            <MailCheck className="h-7 w-7 text-green-600" />
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-gray-900">Check your email</h2>
            <p className="text-sm text-gray-600">
              If an account exists for that address, we sent a password reset link. The link expires
              in 1 hour.
            </p>
          </div>
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-sm font-medium transition-opacity hover:opacity-75"
            style={{ color: BRAND.primary }}
          >
            <ArrowLeft className="h-4 w-4" /> Back to sign in
          </Link>
        </div>
      ) : (
        <>
          <div className="mb-6 space-y-1">
            <h2 className="text-3xl font-bold text-gray-900">Reset your password</h2>
            <p className="text-gray-600">Enter your email and we&apos;ll send you a reset link</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium text-gray-700">
                Email address <span className="text-red-500">*</span>
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                autoFocus
                placeholder="you@company.com"
                disabled={isLoading}
                {...register('email')}
                className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none transition-colors focus:border-orange-500 disabled:cursor-not-allowed disabled:opacity-50"
              />
              {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
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
                  <Loader2 className="h-5 w-5 animate-spin" /> Sending…
                </>
              ) : (
                <>
                  <Send className="h-5 w-5" /> Send reset link
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-600">
            Remembered it?{' '}
            <Link
              href="/login"
              className="font-medium underline-offset-2 hover:underline"
              style={{ color: BRAND.primary }}
            >
              Back to sign in
            </Link>
          </p>
        </>
      )}
    </AuthShell>
  );
}
