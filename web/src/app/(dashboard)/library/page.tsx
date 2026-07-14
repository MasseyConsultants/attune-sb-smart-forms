// Author: Robert Massey | Created: 2026-07-13 | Module: Web / Library

import type { Metadata } from 'next';

import { LibraryGallery } from './library-gallery';

export const metadata: Metadata = { title: 'Template Library' };

export default function LibraryPage(): React.ReactElement {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Template Library</h1>
        <p className="text-sm text-muted-foreground">
          Start from a proven template instead of a blank page. Cloning adds a draft form (and any
          bundled workflow) to your workspace, ready to customize and publish.
        </p>
      </div>
      <LibraryGallery />
    </div>
  );
}
