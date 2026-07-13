// Author: Robert Massey | Created: 2026-07-13 | Module: Web / Templates List

import type { Metadata } from 'next';

import { TemplatesList } from './templates-list';

export const metadata: Metadata = { title: 'Document Templates' };

export default function TemplatesPage(): React.ReactElement {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Document templates</h1>
        <p className="text-sm text-muted-foreground">
          Upload the PDF or Word forms you already use, then map form fields onto them — submissions
          fill your exact document.
        </p>
      </div>
      <TemplatesList />
    </div>
  );
}
