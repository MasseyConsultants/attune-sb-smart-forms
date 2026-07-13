// Author: Robert Massey | Created: 2026-07-12 | Module: Web / Auth
// Purpose: Self-serve signup — creates org + OWNER + 14-day Growth trial, no card
// required. Terms/privacy consent checkbox is required (recorded server-side).

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Loader2, AlertCircle, Rocket } from 'lucide-react';

import { useAuth } from '@/hooks/use-auth';
import { BRAND } from '@/lib/brand';
import { AuthShell } from '@/components/brand/auth-shell';
import { cn } from '@/lib/utils';

const signupSchema = z.object({
  organizationName: z.string().min(2, 'Business name is required').max(200),
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  email: z.string().email('Please enter a valid email address'),
  password: z
    .string()
    .min(12, 'Password must be at least 12 characters')
    .max(128, 'Password must be at most 128 characters'),
  acceptedTerms: z.literal(true, {
    errorMap: () => ({ message: 'You must accept the Terms and Privacy Policy to continue' }),
  }),
});

type SignupFormValues = z.infer<typeof signupSchema>;

const HERO = {
  title: 'Start your free trial',
  subtitle: '14 days of the Growth plan. No credit card required.',
  badgeText: 'Free 14-day Trial',
  features: [
    {
      title: 'Build your first form in minutes',
      desc: 'Drag-and-drop builder with 30 field types and conditional logic',
    },
    {
      title: 'Your forms, your documents',
      desc: 'Upload the PDFs you already use and fill them automatically',
    },
    {
      title: 'Cancel anytime',
      desc: 'Export your data whenever you want — it is yours',
    },
  ],
};

export default function SignupPage(): React.ReactElement {
  const router = useRouter();
  const { signup, isLoading, isAuthenticated, isHydrated, error, clearError } = useAuth();
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (isHydrated && isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isHydrated, isAuthenticated, router]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    mode: 'onBlur',
    defaultValues: {
      organizationName: '',
      firstName: '',
      lastName: '',
      email: '',
      password: '',
    },
  });

  const onSubmit = async (values: SignupFormValues): Promise<void> => {
    clearError();
    await signup(values);
    const state = useAuth.getState();
    if (state.isAuthenticated) {
      router.replace('/dashboard?welcome=1');
    }
  };

  const inputClass =
    'h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none transition-colors focus:border-orange-500 disabled:cursor-not-allowed disabled:opacity-50';

  return (
    <AuthShell hero={HERO} showLegalFooter={false}>
      <div className="mb-6 space-y-1">
        <h2 className="text-3xl font-bold text-gray-900">Create your workspace</h2>
        <p className="text-gray-600">Free for 14 days — no credit card required</p>
      </div>

      {error && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <div>
            <p className="text-sm font-medium text-red-900">Signup failed</p>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="organizationName" className="text-sm font-medium text-gray-700">
            Business name <span className="text-red-500">*</span>
          </label>
          <input
            id="organizationName"
            type="text"
            autoComplete="organization"
            autoFocus
            placeholder="Acme Plumbing Co"
            disabled={isLoading}
            {...register('organizationName')}
            className={inputClass}
          />
          {errors.organizationName && (
            <p className="text-xs text-red-600">{errors.organizationName.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label htmlFor="firstName" className="text-sm font-medium text-gray-700">
              First name <span className="text-red-500">*</span>
            </label>
            <input
              id="firstName"
              type="text"
              autoComplete="given-name"
              placeholder="Jane"
              disabled={isLoading}
              {...register('firstName')}
              className={inputClass}
            />
            {errors.firstName && <p className="text-xs text-red-600">{errors.firstName.message}</p>}
          </div>
          <div className="space-y-1.5">
            <label htmlFor="lastName" className="text-sm font-medium text-gray-700">
              Last name <span className="text-red-500">*</span>
            </label>
            <input
              id="lastName"
              type="text"
              autoComplete="family-name"
              placeholder="Roe"
              disabled={isLoading}
              {...register('lastName')}
              className={inputClass}
            />
            {errors.lastName && <p className="text-xs text-red-600">{errors.lastName.message}</p>}
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="email" className="text-sm font-medium text-gray-700">
            Work email <span className="text-red-500">*</span>
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            disabled={isLoading}
            {...register('email')}
            className={inputClass}
          />
          {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
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
              placeholder="At least 12 characters"
              disabled={isLoading}
              {...register('password')}
              className={cn(inputClass, 'pr-11')}
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

        <label className="flex cursor-pointer select-none items-start gap-2.5 pt-1">
          <input
            type="checkbox"
            disabled={isLoading}
            {...register('acceptedTerms')}
            className="mt-0.5 h-4 w-4 rounded border-gray-300"
            style={{ accentColor: BRAND.primary }}
          />
          <span className="text-sm text-gray-700">
            I agree to the{' '}
            <Link
              href="/terms"
              target="_blank"
              className="font-medium underline-offset-2 hover:underline"
              style={{ color: BRAND.primary }}
            >
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link
              href="/privacy"
              target="_blank"
              className="font-medium underline-offset-2 hover:underline"
              style={{ color: BRAND.primary }}
            >
              Privacy Policy
            </Link>
          </span>
        </label>
        {errors.acceptedTerms && (
          <p className="text-xs text-red-600">{errors.acceptedTerms.message}</p>
        )}

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
              <Loader2 className="h-5 w-5 animate-spin" /> Creating workspace…
            </>
          ) : (
            <>
              <Rocket className="h-5 w-5" /> Start free trial
            </>
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-600">
        Already have an account?{' '}
        <Link
          href="/login"
          className="font-medium underline-offset-2 hover:underline"
          style={{ color: BRAND.primary }}
        >
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
