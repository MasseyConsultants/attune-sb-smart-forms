// Author: Robert Massey | Created: 2026-07-13 | Module: Web / Mapping Studio

import type { Metadata } from 'next';

import { TemplateStudio } from './template-studio';

export const metadata: Metadata = { title: 'Map fields' };

export default async function TemplateStudioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.ReactElement> {
  const { id } = await params;
  return <TemplateStudio templateId={id} />;
}
