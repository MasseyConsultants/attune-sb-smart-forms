// Author: Robert Massey | Created: 2026-07-12 | Module: Web / Brand
// Purpose: Ornamental divider used on branded hero panels — extracted into a shared
// component (the enterprise edition defined this inline per page; fixed here per §6a).

import { cn } from '@/lib/utils';

export function DecorativeSeparator({ larger = false }: { larger?: boolean }): React.ReactElement {
  return (
    <div className="flex items-center justify-center gap-2" aria-hidden>
      <span className="h-px w-8 bg-white/50" />
      <span className={cn('rounded-full bg-white/35', larger ? 'h-2 w-2' : 'h-1.5 w-1.5')} />
      <span className="h-px w-6 bg-white/60" />
      <span
        className={cn('rounded-full bg-white/70', larger ? 'h-2.5 w-2.5' : 'h-2 w-2')}
        style={{ boxShadow: '0 0 8px rgba(255,255,255,0.45)' }}
      />
      <span className="h-px w-6 bg-white/60" />
      <span className={cn('rounded-full bg-white/35', larger ? 'h-2 w-2' : 'h-1.5 w-1.5')} />
      <span className="h-px w-8 bg-white/50" />
    </div>
  );
}
