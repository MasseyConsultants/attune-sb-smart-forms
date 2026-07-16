// Author: Robert Massey | Created: 2026-07-16 | Module: Web / Admin Ops Hooks
// Purpose: TanStack Query hooks for the Platform Ops console (SB-025).

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  OpsEventKind,
  OpsEventsPage,
  OpsOverview,
  OpsQueuesResponse,
  OpsUsageHotspot,
  OpsWebhooksPage,
} from '@attune-sb/shared-types';

interface Envelope<T> {
  readonly success: boolean;
  readonly data: T;
  readonly error?: { readonly code: string; readonly message: string };
}

async function fetchEnvelope<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init);
  if (res.status === 204) {
    return undefined as T;
  }
  const envelope = (await res.json()) as Envelope<T>;
  if (!res.ok || !envelope.success) {
    throw new Error(envelope.error?.message ?? `Request failed (${res.status})`);
  }
  return envelope.data;
}

export function useOpsOverview() {
  return useQuery({
    queryKey: ['admin', 'ops', 'overview'],
    queryFn: () => fetchEnvelope<OpsOverview>('/api/admin/ops/overview'),
    refetchInterval: 30_000,
    staleTime: 10_000,
  });
}

export interface OpsEventsFilter {
  kind?: OpsEventKind | '';
  severity?: string;
  search?: string;
  page?: number;
}

export function useOpsEvents(filter: OpsEventsFilter) {
  const params = new URLSearchParams({ pageSize: '50', page: String(filter.page ?? 1) });
  if (filter.kind) params.set('kind', filter.kind);
  if (filter.severity) params.set('severity', filter.severity);
  if (filter.search) params.set('search', filter.search);
  return useQuery({
    queryKey: [
      'admin',
      'ops',
      'events',
      filter.kind ?? '',
      filter.severity ?? '',
      filter.search ?? '',
      filter.page ?? 1,
    ],
    queryFn: () => fetchEnvelope<OpsEventsPage>(`/api/admin/ops/events?${params}`),
    staleTime: 15_000,
  });
}

export function useOpsQueues() {
  return useQuery({
    queryKey: ['admin', 'ops', 'queues'],
    queryFn: () => fetchEnvelope<OpsQueuesResponse>('/api/admin/ops/queues'),
    refetchInterval: 30_000,
    staleTime: 10_000,
  });
}

export function useOpsWebhooks(type?: string, page = 1) {
  const params = new URLSearchParams({ pageSize: '50', page: String(page) });
  if (type) params.set('type', type);
  return useQuery({
    queryKey: ['admin', 'ops', 'webhooks', type ?? '', page],
    queryFn: () => fetchEnvelope<OpsWebhooksPage>(`/api/admin/ops/webhooks?${params}`),
    staleTime: 30_000,
  });
}

export function useOpsUsageHotspots() {
  return useQuery({
    queryKey: ['admin', 'ops', 'usage-hotspots'],
    queryFn: () => fetchEnvelope<OpsUsageHotspot[]>('/api/admin/ops/usage-hotspots'),
    staleTime: 60_000,
  });
}

function useInvalidateQueues() {
  const queryClient = useQueryClient();
  return (): void => {
    void queryClient.invalidateQueries({ queryKey: ['admin', 'ops', 'queues'] });
    void queryClient.invalidateQueries({ queryKey: ['admin', 'ops', 'overview'] });
  };
}

export function useRetryJob() {
  const invalidate = useInvalidateQueues();
  return useMutation({
    mutationFn: ({ queue, jobId }: { queue: string; jobId: string }) =>
      fetchEnvelope<void>(`/api/admin/ops/queues/${queue}/jobs/${jobId}/retry`, {
        method: 'POST',
      }),
    onSuccess: invalidate,
  });
}

export function useDiscardJob() {
  const invalidate = useInvalidateQueues();
  return useMutation({
    mutationFn: ({ queue, jobId }: { queue: string; jobId: string }) =>
      fetchEnvelope<void>(`/api/admin/ops/queues/${queue}/jobs/${jobId}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });
}
