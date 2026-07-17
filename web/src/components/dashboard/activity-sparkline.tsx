// Author: Robert Massey | Created: 2026-07-16 | Module: Web / Dashboard
// Purpose: Dependency-free SVG sparkline for submissions / doc fills by day.

import type { DashboardDayCount, DashboardSeries } from '@attune-sb/shared-types';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function SparkPath({
  series,
  width,
  height,
  stroke,
}: {
  series: ReadonlyArray<DashboardDayCount>;
  width: number;
  height: number;
  stroke: string;
}): React.ReactElement | null {
  if (series.length === 0) return null;
  const max = Math.max(1, ...series.map((d) => d.count));
  const step = series.length > 1 ? width / (series.length - 1) : width;
  const points = series
    .map((d, i) => {
      const x = i * step;
      const y = height - (d.count / max) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <polyline
      fill="none"
      stroke={stroke}
      strokeWidth="2"
      strokeLinejoin="round"
      strokeLinecap="round"
      points={points}
    />
  );
}

interface ActivitySparklineProps {
  readonly series: DashboardSeries;
  readonly windowDays: number;
}

export function ActivitySparkline({
  series,
  windowDays,
}: ActivitySparklineProps): React.ReactElement {
  const width = 280;
  const height = 56;
  const subTotal = series.submissionsByDay.reduce((n, d) => n + d.count, 0);
  const fillTotal = series.documentFillsByDay.reduce((n, d) => n + d.count, 0);

  return (
    <Card data-testid="activity-sparkline">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Activity · last {windowDays} days</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="mb-1 flex items-baseline justify-between text-xs">
            <span className="text-muted-foreground">Submissions</span>
            <span className="font-medium tabular-nums text-foreground">{subTotal}</span>
          </div>
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="h-14 w-full text-primary"
            role="img"
            aria-label={`Submissions over ${windowDays} days`}
          >
            <SparkPath
              series={series.submissionsByDay}
              width={width}
              height={height}
              stroke="currentColor"
            />
          </svg>
        </div>
        <div>
          <div className="mb-1 flex items-baseline justify-between text-xs">
            <span className="text-muted-foreground">Documents filled</span>
            <span className="font-medium tabular-nums text-foreground">{fillTotal}</span>
          </div>
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="h-14 w-full text-orange-600"
            role="img"
            aria-label={`Document fills over ${windowDays} days`}
          >
            <SparkPath
              series={series.documentFillsByDay}
              width={width}
              height={height}
              stroke="currentColor"
            />
          </svg>
        </div>
      </CardContent>
    </Card>
  );
}
