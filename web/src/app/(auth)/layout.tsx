// Author: Robert Massey | Created: 2026-07-12 | Module: Web / Auth Layout
// Purpose: Minimal wrapper for auth pages — no nav, sidebar, or chrome.

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return <>{children}</>;
}
