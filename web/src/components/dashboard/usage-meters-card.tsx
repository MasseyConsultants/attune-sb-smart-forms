// Author: Robert Massey | Created: 2026-07-16 | Module: Web / Dashboard

import Link from 'next/link';
import { Meter, type UsageSummary } from '@attune-sb/shared-types';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MeterBar } from '@/components/billing/meter-bar';
import { Button } from '@/components/ui/button';

interface UsageMetersCardProps {
  readonly usage: UsageSummary;
}

/** Compact home meters — top 4 periodic meters; full set lives on /billing. */
export function UsageMetersCard({ usage }: UsageMetersCardProps): React.ReactElement {
  const meters = usage.meters.filter((m) => m.meter !== Meter.AI_CREDITS).slice(0, 4);

  return (
    <Card data-testid="usage-meters">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Plan usage</CardTitle>
        <CardDescription>Resets on your billing anchor day.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {meters.map((m) => (
          <MeterBar key={m.meter} meter={m.meter} used={m.used} limit={m.limit} ratio={m.ratio} />
        ))}
        <p className="text-xs text-muted-foreground">
          Published forms {usage.counted.activeForms.used}/{usage.counted.activeForms.limit}
          {' · '}
          Templates {usage.counted.uploadedTemplates.used}/{usage.counted.uploadedTemplates.limit}
        </p>
        <Button asChild size="sm" variant="outline">
          <Link href="/billing">View all usage</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
