// Author: Robert Massey | Created: 2026-07-13 | Module: Web / Public Approval
// Purpose: /approvals/[token] — the unauthenticated landing page from the
// approval email. The token in the URL is the entire credential; the page
// shows context, takes an optional note, and records approve/reject.

import { Suspense } from 'react';

import type { Metadata } from 'next';

import { ApprovalClient } from './approval-client';

export const metadata: Metadata = {
  title: 'Approval request',
  robots: { index: false }, // tokens are capabilities, never indexable
};

export default async function ApprovalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<React.ReactElement> {
  const { token } = await params;
  return (
    // useSearchParams (the ?decision= preselect) requires a Suspense boundary
    <Suspense>
      <ApprovalClient token={token} />
    </Suspense>
  );
}
