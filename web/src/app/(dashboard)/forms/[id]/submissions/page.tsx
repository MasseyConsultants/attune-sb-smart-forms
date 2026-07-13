// Author: Robert Massey | Created: 2026-07-13 | Module: Web / Submissions Page
// Purpose: Dashboard route for a form's submissions table + export.

import { SubmissionsView } from './submissions-view';

export const metadata = { title: 'Submissions' };

export default async function SubmissionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.ReactElement> {
  const { id } = await params;
  return <SubmissionsView formId={id} />;
}
