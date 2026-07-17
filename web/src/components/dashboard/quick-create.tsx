// Author: Robert Massey | Created: 2026-07-16 | Module: Web / Dashboard

import Link from 'next/link';
import { FilePlus2, FileStack, LibraryBig, Workflow } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface QuickCreateProps {
  readonly canCreate: boolean;
}

export function QuickCreate({ canCreate }: QuickCreateProps): React.ReactElement | null {
  if (!canCreate) return null;

  return (
    <div className="flex flex-wrap gap-2" data-testid="quick-create">
      <Button asChild size="sm">
        <Link href="/forms">
          <FilePlus2 className="mr-1.5 h-4 w-4" />
          New form
        </Link>
      </Button>
      <Button asChild size="sm" variant="outline">
        <Link href="/templates">
          <FileStack className="mr-1.5 h-4 w-4" />
          Upload PDF
        </Link>
      </Button>
      <Button asChild size="sm" variant="outline">
        <Link href="/workflows">
          <Workflow className="mr-1.5 h-4 w-4" />
          New workflow
        </Link>
      </Button>
      <Button asChild size="sm" variant="ghost">
        <Link href="/library">
          <LibraryBig className="mr-1.5 h-4 w-4" />
          Browse library
        </Link>
      </Button>
    </div>
  );
}
