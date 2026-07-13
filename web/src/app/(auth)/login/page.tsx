// Author: Robert Massey | Created: 2026-07-12 | Module: Web / Auth
// Purpose: Login page — branded two-column layout, single-step email+password
// (the enterprise SSO domain-check step is removed for SMB v1).

'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Loader2, AlertCircle, Shield, LogOut } from 'lucide-react';

import { useAuth } from '@/hooks/use-auth';
import { BRAND } from '@/lib/brand';
import { AuthShell } from '@/components/brand/auth-shell';
import { cn } from '@/lib/utils';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage(): React.ReactElement {
  return (
    <Suspense
      fallback={
        <AuthShell>
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-r-transparent" />
          </div>
        </AuthShell>
      }
    >
      <LoginContent />
    </Suspense>
  );
}

function LoginContent(): React.ReactElement {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isLoading, isAuthenticated, isHydrated, error, clearError } = useAuth();
  const [showPassword, setShowPassword] = useState(false);

  const signedOut = searchParams.get('signedOut') === '1';

  useEffect(() => {
    if (isHydrated && isAuthenticated) {
      router.replace(searchParams.get('from') ?? '/dashboard');
    }
  }, [isHydrated, isAuthenticated, router, searchParams]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: 'onBlur',
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values: LoginFormValues): Promise<void> => {
    clearError();
    await login(values);
    const state = useAuth.getState();
    if (state.isAuthenticated) {
      router.replace(searchParams.get('from') ?? '/dashboard');
    }
  };

  return (
    <AuthShell>
      <div className="mb-6 space-y-1">
        <h2 className="text-3xl font-bold text-gray-900">Welcome back</h2>
        <p className="text-gray-600">Sign in to your workspace</p>
      </div>

      {signedOut && !error && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4">
          <LogOut className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
          <div>
            <p className="text-sm font-medium text-green-900">Signed out successfully</p>
            <p className="text-sm text-green-700">
              You have been securely signed out of your account.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <div>
            <p className="text-sm font-medium text-red-900">Sign-in failed</p>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

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

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="text-sm font-medium text-gray-700">
              Password <span className="text-red-500">*</span>
            </label>
            <Link
              href="/forgot-password"
              className="text-sm font-medium transition-opacity hover:opacity-75"
              style={{ color: BRAND.primary }}
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Enter your password"
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
              <Loader2 className="h-5 w-5 animate-spin" /> Signing in…
            </>
          ) : (
            <>
              <Shield className="h-5 w-5" /> Sign in securely
            </>
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-600">
        New to {BRAND.appName}?{' '}
        <Link
          href="/signup"
          className="font-medium underline-offset-2 hover:underline"
          style={{ color: BRAND.primary }}
        >
          Start your free trial
        </Link>
      </p>
    </AuthShell>
  );
}
