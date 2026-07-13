// Author: Robert Massey | Created: 2026-07-12 | Module: Web / Providers
// Purpose: Hydrates the Zustand auth store on app boot from browser cookies.
// Ported from enterprise (SSO cookie handling removed for SMB).

'use client';

import { useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';

export function AuthProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const hydrateFromCookie = useAuth((s) => s.hydrateFromCookie);

  useEffect(() => {
    hydrateFromCookie();
  }, [hydrateFromCookie]);

  return <>{children}</>;
}
