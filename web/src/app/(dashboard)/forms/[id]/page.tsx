// Author: Robert Massey | Created: 2026-07-13 | Module: Web / Form Builder Page

import type { Metadata } from 'next';

import { BuilderLoader } from './builder-loader';

export const metadata: Metadata = { title: 'Form builder' };

export default async function BuilderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.ReactElement> {
  const { id } = await params;
  return <BuilderLoader formId={id} />;
}
