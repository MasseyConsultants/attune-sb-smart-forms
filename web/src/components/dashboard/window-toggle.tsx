// Author: Robert Massey | Created: 2026-07-16 | Module: Web / Dashboard
// Purpose: 7 / 14 / 30 day window switcher via query string (SSR-friendly links).

import Link from 'next/link';

const WINDOWS = [7, 14, 30] as const;

interface WindowToggleProps {
  readonly windowDays: number;
  readonly welcome?: boolean;
}

export function WindowToggle({ windowDays, welcome }: WindowToggleProps): React.ReactElement {
  return (
    <div className="inline-flex rounded-md border p-0.5" role="group" aria-label="Time window">
      {WINDOWS.map((days) => {
        const active = days === windowDays;
        const params = new URLSearchParams();
        params.set('windowDays', String(days));
        if (welcome) params.set('welcome', '1');
        return (
          <Link
            key={days}
            href={`/dashboard?${params.toString()}`}
            className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
              active
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            aria-current={active ? 'true' : undefined}
          >
            {days}d
          </Link>
        );
      })}
    </div>
  );
}
