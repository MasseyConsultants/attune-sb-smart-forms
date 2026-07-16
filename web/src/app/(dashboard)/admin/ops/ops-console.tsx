// Author: Robert Massey | Created: 2026-07-16 | Module: Web / Admin Ops

'use client';

import { useState } from 'react';

import { Activity, AlertTriangle, Gauge, Layers, Webhook } from 'lucide-react';

import { cn } from '@/lib/utils';

import { OpsEventsTab } from './ops-events';
import { OpsOverviewTab } from './ops-overview';
import { OpsQueuesTab } from './ops-queues';
import { OpsUsageTab } from './ops-usage';
import { OpsWebhooksTab } from './ops-webhooks';

const TABS = [
  { id: 'overview', label: 'Overview', icon: Activity },
  { id: 'events', label: 'Errors & Security', icon: AlertTriangle },
  { id: 'queues', label: 'Queues', icon: Layers },
  { id: 'webhooks', label: 'Webhooks', icon: Webhook },
  { id: 'usage', label: 'Usage Hotspots', icon: Gauge },
] as const;

type TabId = (typeof TABS)[number]['id'];

export function OpsConsole(): React.ReactElement {
  const [tab, setTab] = useState<TabId>('overview');

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1 border-b">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              'flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors',
              tab === id
                ? 'border-[var(--brand-primary,#F97316)] text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'overview' && <OpsOverviewTab />}
      {tab === 'events' && <OpsEventsTab />}
      {tab === 'queues' && <OpsQueuesTab />}
      {tab === 'webhooks' && <OpsWebhooksTab />}
      {tab === 'usage' && <OpsUsageTab />}
    </div>
  );
}
