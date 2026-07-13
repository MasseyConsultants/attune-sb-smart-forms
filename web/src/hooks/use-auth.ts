// Author: Robert Massey | Created: 2026-07-12 | Module: Web / Auth Hook
// Purpose: Zustand store owning client-side auth state. Ported from enterprise.
// Tokens never live here — they are httpOnly cookies managed by Route Handlers.
// SMB adds a signup action (self-serve org creation); SSO paths are removed.

'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface AuthUser {
  readonly userId: string;
  readonly email: string;
  readonly role: string;
  readonly organizationId: string;
}

interface LoginPayload {
  readonly email: string;
  readonly password: string;
}

interface SignupPayload {
  readonly email: string;
  readonly password: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly organizationName: string;
  readonly acceptedTerms: boolean;
}

interface AuthState {
  readonly user: AuthUser | null;
  readonly isAuthenticated: boolean;
  readonly isHydrated: boolean;
  readonly isLoading: boolean;
  readonly error: string | null;
}

interface AuthActions {
  login(payload: LoginPayload): Promise<void>;
  signup(payload: SignupPayload): Promise<void>;
  logout(): Promise<void>;
  clearError(): void;
  hydrateFromCookie(): void;
}

type AuthStore = AuthState & AuthActions;

interface AuthApiEnvelope {
  success: boolean;
  data?: AuthUser;
  error?: { message: string };
}

export const useAuth = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isHydrated: false,
      isLoading: false,
      error: null,

      login: async ({ email, password }) => {
        set({ isLoading: true, error: null });
        try {
          const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          });
          const data = (await res.json()) as AuthApiEnvelope;

          if (!res.ok || !data.success) {
            set({ isLoading: false, error: data.error?.message ?? 'Login failed' });
            return;
          }
          set({ user: data.data ?? null, isAuthenticated: true, isLoading: false, error: null });
        } catch {
          set({ isLoading: false, error: 'Network error — please try again' });
        }
      },

      signup: async (payload) => {
        set({ isLoading: true, error: null });
        try {
          const res = await fetch('/api/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          const data = (await res.json()) as AuthApiEnvelope;

          if (!res.ok || !data.success) {
            set({ isLoading: false, error: data.error?.message ?? 'Signup failed' });
            return;
          }
          set({ user: data.data ?? null, isAuthenticated: true, isLoading: false, error: null });
        } catch {
          set({ isLoading: false, error: 'Network error — please try again' });
        }
      },

      logout: async () => {
        set({ isLoading: true });
        try {
          await fetch('/api/auth/logout', { method: 'POST', redirect: 'manual' });
        } catch {
          // Cookies may still be cleared server-side; proceed regardless.
        } finally {
          set({ user: null, isAuthenticated: false, isLoading: false, error: null });
          window.location.href = '/login?signedOut=1';
        }
      },

      clearError: () => set({ error: null }),

      // Reconciles localStorage identity with the authoritative session_active cookie.
      // A fresh tab (empty localStorage) with a live cookie is still authenticated;
      // stale localStorage without the cookie is wiped.
      hydrateFromCookie: () => {
        const cookiePairs = document.cookie.split(';').map((c) => c.trim());
        const hasSession = cookiePairs.some((c) => c.startsWith('session_active='));

        if (!hasSession) {
          set({ user: null, isAuthenticated: false, isHydrated: true });
          return;
        }
        set((s) => ({ user: s.user, isAuthenticated: true, isHydrated: true }));
      },
    }),
    {
      name: 'attune-sb-auth',
      storage: createJSONStorage(() => localStorage),
      // Only persist non-sensitive identity — never tokens or transient flags.
      // isHydrated must boot false so hydrateFromCookie always runs first.
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
