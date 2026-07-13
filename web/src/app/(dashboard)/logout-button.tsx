// Author: Robert Massey | Created: 2026-07-12 | Module: Web / Dashboard
// Purpose: Sign-out control for the app shell — clears the Zustand store and
// httpOnly cookies via the logout route handler.

'use client';

import { LogOut } from 'lucide-react';

import { useAuth } from '@/hooks/use-auth';

export function LogoutButton(): React.ReactElement {
  const logout = useAuth((s) => s.logout);

  return (
    <button
      type="button"
      onClick={() => void logout()}
      className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-white/10"
    >
      <LogOut className="h-4 w-4" />
      Sign out
    </button>
  );
}
