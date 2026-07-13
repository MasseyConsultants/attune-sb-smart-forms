// Author: Robert Massey | Created: 2026-07-12 | Module: Web / Home
// Purpose: Root route. The full marketing homepage ships in Phase 5 (S10);
// until then, send visitors to login (authenticated users are bounced onward
// to /dashboard by the auth pages themselves).

import { redirect } from 'next/navigation';

export default function HomePage(): never {
  redirect('/login');
}
