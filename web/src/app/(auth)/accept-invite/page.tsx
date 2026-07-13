// Author: Robert Massey | Created: 2026-07-12 | Module: Web / Auth
// Purpose: Accept-invite page — validates the emailed token, lets the invitee set
// a password, then sends them to sign in. Branded like all auth pages (§6a).

'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle, UserPlus } from 'lucide-react';

import { BRAND } from '@/lib/brand';
import { AuthShell } from '@/components/brand/auth-shell';
import { cn } from '@/lib/utils';

const schema = z
  .object({
    password: z
      .string()
      .min(12, 'Password must be at least 12 characters')
      .max(128, 'Password must be at most 128 characters'),
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type FormValues = z.infer<typeof schema>;

interface InviteInfo {
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly organizationName?: string;
  readonly role: string;
}

const HERO = { badgeText: 'Team Invitation' };

export default function AcceptInvitePage(): React.ReactElement {
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
      <AcceptInviteContent />
    </Suspense>
  );
}

type PageState = 'validating' | 'invalid' | 'ready' | 'done';

function AcceptInviteContent(): React.ReactElement {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [state, setState] = useState<PageState>('validating');
  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!token) {
      setState('invalid');
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/invitations/validate/${encodeURIComponent(token)}`);
        const data = (await res.json()) as {
          success: boolean;
          data?: InviteInfo;
          error?: { message: string };
        };
        if (cancelled) return;
        if (!res.ok || !data.success || !data.data) {
          setError(data.error?.message ?? 'This invitation is invalid or has expired.');
          setState('invalid');
          return;
        }
        setInvite(data.data);
        setState('ready');
      } catch {
        if (!cancelled) {
          setError('Could not validate the invitation. Please try again.');
          setState('invalid');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
    defaultValues: { password: '', confirmPassword: '' },
  });

  const onSubmit = async (values: FormValues): Promise<void> => {
    setError(null);
    setIsLoading(true);
    try {
      const res = await fetch('/api/invitations/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: values.password }),
      });
      const data = (await res.json()) as { success: boolean; error?: { message: string } };
      if (!res.ok || !data.success) {
        setError(data.error?.message ?? 'Could not accept the invitation.');
        return;
      }
      setState('done');
    } catch {
      setError('Network error — please try again');
    } finally {
      setIsLoading(false);
    }
  };

  if (state === 'validating') {
    return (
      <AuthShell hero={HERO}>
        <div className="flex flex-col items-center gap-4 py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-r-transparent" />
          <p className="text-sm text-gray-600">Validating your invitation…</p>
        </div>
      </AuthShell>
    );
  }

  if (state === 'invalid') {
    return (
      <AuthShell hero={HERO}>
        <div className="space-y-5 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
            <AlertCircle className="h-7 w-7 text-red-600" />
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-gray-900">Invitation not valid</h2>
            <p className="text-sm text-gray-600">
              {error ?? 'This invitation link is invalid or has expired.'} Ask your workspace admin
              to send a new one.
            </p>
          </div>
          <Link
            href="/login"
            className="text-sm font-medium transition-opacity hover:opacity-75"
            style={{ color: BRAND.primary }}
          >
            Back to sign in
          </Link>
        </div>
      </AuthShell>
    );
  }

  if (state === 'done') {
    return (
      <AuthShell hero={HERO}>
        <div className="space-y-5 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-50">
            <CheckCircle className="h-7 w-7 text-green-600" />
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-gray-900">You&apos;re in!</h2>
            <p className="text-sm text-gray-600">
              Your account is ready. Sign in with your email and new password.
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
        <h2 className="text-3xl font-bold text-gray-900">
          Welcome{invite ? `, ${invite.firstName}` : ''}!
        </h2>
        <p className="text-gray-600">
          You&apos;ve been invited to join{' '}
          <span className="font-medium text-gray-900">
            {invite?.organizationName ?? 'your team'}
          </span>{' '}
          as <span className="font-medium text-gray-900">{invite?.role.toLowerCase()}</span>. Set a
          password to activate your account.
        </p>
      </div>

      {error && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">Email</label>
          <input
            type="email"
            value={invite?.email ?? ''}
            disabled
            readOnly
            className="h-11 w-full cursor-default rounded-lg border border-gray-300 bg-gray-50 px-3 text-sm text-gray-500 outline-none"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="password" className="text-sm font-medium text-gray-700">
            Password <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              autoFocus
              placeholder="At least 12 characters"
              disabled={isLoading}
              {...register('password')}
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
          {errors.password && <p className="text-xs text-red-600">{errors.password.message}</p>}
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
              <Loader2 className="h-5 w-5 animate-spin" /> Activating…
            </>
          ) : (
            <>
              <UserPlus className="h-5 w-5" /> Activate account
            </>
          )}
        </button>
      </form>
    </AuthShell>
  );
}
