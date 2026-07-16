// Author: Robert Massey | Created: 2026-07-16 | Module: Web / Admin Ops

'use client';

import { useState } from 'react';

import { Loader2, Search, Webhook } from 'lucide-react';

import { useOpsWebhooks } from '@/hooks/use-admin-ops';

const PAGE_SIZE = 50;

export function OpsWebhooksTab(): React.ReactElement {
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);
  const webhooks = useOpsWebhooks(type || undefined, page);

  const total = webhooks.data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
          <input
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setPage(1);
            }}
            placeholder="Filter by event type (e.g. invoice)…"
            className="w-72 rounded-md border bg-background py-1.5 pl-8 pr-3 text-sm"
          />
        </div>
        {webhooks.data && <p className="text-xs text-muted-foreground">{total} events processed</p>}
      </div>

      {webhooks.isLoading ? (
        <div className="flex items-center justify-center rounded-lg border p-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (webhooks.data?.events ?? []).length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-16 text-center">
          <Webhook className="h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm font-medium">No Stripe webhook events</p>
          <p className="text-xs text-muted-foreground">
            Every verified webhook is recorded here for idempotency — replays are skipped.
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Event ID</th>
                  <th className="px-4 py-2.5 font-medium">Type</th>
                  <th className="px-4 py-2.5 font-medium">Processed</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(webhooks.data?.events ?? []).map((event) => (
                  <tr key={event.id} className="hover:bg-muted/30">
                    <td className="px-4 py-2 font-mono text-xs">{event.id}</td>
                    <td className="px-4 py-2 font-mono text-xs">{event.type}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">
                      {new Date(event.processedAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pageCount > 1 && (
            <div className="flex items-center justify-end gap-2 text-xs">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded border px-2 py-1 disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-muted-foreground">
                Page {page} of {pageCount}
              </span>
              <button
                disabled={page >= pageCount}
                onClick={() => setPage((p) => p + 1)}
                className="rounded border px-2 py-1 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
