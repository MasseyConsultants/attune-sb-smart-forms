// Author: Robert Massey | Created: 2026-07-13 | Module: Web / Workflows Hooks
// Purpose: TanStack Query hooks for the workflow builder, list, and runs
// views. Publish surfaces LIMIT_EXCEEDED (the plan-tier node gate) as
// LimitExceededError so the builder renders the upgrade prompt inline.

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  WorkflowDetail,
  WorkflowEdge,
  WorkflowNode,
  WorkflowRunDetail,
  WorkflowRunSummary,
  WorkflowSummary,
} from '@attune-sb/shared-types';

import { LimitExceededError } from './use-forms';

interface Envelope<T> {
  readonly success: boolean;
  readonly data: T;
  readonly error?: {
    readonly code: string;
    readonly message: string;
    readonly details?: Record<string, unknown>;
  };
}

async function parseEnvelope<T>(res: Response): Promise<T> {
  const envelope = (await res.json()) as Envelope<T>;
  if (!res.ok || !envelope.success) {
    if (envelope.error?.code === 'LIMIT_EXCEEDED') {
      const details = envelope.error.details ?? {};
      throw new LimitExceededError(
        envelope.error.message,
        Number(details.limit ?? 0),
        Number(details.current ?? 0),
        String(details.upgradeUrl ?? '/billing'),
      );
    }
    throw new Error(envelope.error?.message ?? `Request failed (${res.status})`);
  }
  return envelope.data;
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  return parseEnvelope<T>(await fetch(path, init));
}

export interface SaveWorkflowInput {
  name?: string;
  description?: string | null;
  nodes?: WorkflowNode[];
  edges?: WorkflowEdge[];
  triggerFormId?: string | null;
}

export function useWorkflowsList() {
  return useQuery({
    queryKey: ['workflows', 'list'],
    queryFn: () =>
      fetchJson<{ workflows: WorkflowSummary[]; total: number }>('/api/workflows?pageSize=50'),
    staleTime: 15_000,
  });
}

export function useWorkflow(id: string) {
  return useQuery({
    queryKey: ['workflows', id],
    queryFn: () => fetchJson<WorkflowDetail>(`/api/workflows/${id}`),
    staleTime: 0,
  });
}

export function useCreateWorkflow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; triggerFormId?: string }) =>
      fetchJson<WorkflowDetail>('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['workflows', 'list'] }),
  });
}

export function useSaveWorkflow(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SaveWorkflowInput) =>
      fetchJson<WorkflowDetail>(`/api/workflows/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(['workflows', id], data);
      void queryClient.invalidateQueries({ queryKey: ['workflows', 'list'] });
    },
  });
}

/** Publish/unpublish. Publish throws LimitExceededError on the tier gate. */
export function useWorkflowAction(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (action: 'publish' | 'unpublish') =>
      fetchJson<WorkflowDetail>(`/api/workflows/${id}/${action}`, { method: 'POST' }),
    onSuccess: (data) => {
      queryClient.setQueryData(['workflows', id], data);
      void queryClient.invalidateQueries({ queryKey: ['workflows', 'list'] });
    },
  });
}

export function useDeleteWorkflow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/workflows/${id}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 204) {
        throw new Error(`Delete failed (${res.status})`);
      }
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['workflows', 'list'] }),
  });
}

export function useWorkflowRuns(workflowId: string) {
  return useQuery({
    queryKey: ['workflows', workflowId, 'runs'],
    queryFn: () =>
      fetchJson<{ runs: WorkflowRunSummary[]; total: number }>(
        `/api/workflows/${workflowId}/runs?pageSize=50`,
      ),
    refetchInterval: 10_000, // runs land asynchronously — keep the list fresh
  });
}

export function useWorkflowRun(runId: string | null) {
  return useQuery({
    queryKey: ['workflows', 'runs', runId],
    queryFn: () => fetchJson<WorkflowRunDetail>(`/api/workflows/runs/${runId}`),
    enabled: runId !== null,
  });
}
