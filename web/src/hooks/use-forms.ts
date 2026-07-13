// Author: Robert Massey | Created: 2026-07-13 | Module: Web / Forms Hooks
// Purpose: TanStack Query hooks for the forms domain, fed by the forms BFF
// routes. LIMIT_EXCEEDED responses surface as LimitExceededError so the
// builder can render the upgrade flow instead of a generic failure toast.

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { Form, FormSchema } from '@attune-sb/shared-types';

interface Envelope<T> {
  readonly success: boolean;
  readonly data: T;
  readonly error?: {
    readonly code: string;
    readonly message: string;
    readonly details?: Record<string, unknown>;
  };
}

export interface PaginatedForms {
  readonly forms: Form[];
  readonly total: number;
}

export class LimitExceededError extends Error {
  constructor(
    message: string,
    readonly limit: number,
    readonly current: number,
    readonly upgradeUrl: string,
  ) {
    super(message);
    this.name = 'LimitExceededError';
  }
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init);
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

function postJson<T>(path: string, body?: unknown): Promise<T> {
  return fetchJson<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });
}

export function useFormsList() {
  return useQuery({
    queryKey: ['forms', 'list'],
    queryFn: () => fetchJson<PaginatedForms>('/api/forms?pageSize=100'),
    staleTime: 15_000,
  });
}

export function useForm(id: string) {
  return useQuery({
    queryKey: ['forms', id],
    queryFn: () => fetchJson<Form>(`/api/forms/${id}`),
    staleTime: 0,
  });
}

export function useCreateForm() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string }) => postJson<Form>('/api/forms', input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['forms', 'list'] }),
  });
}

export function useSaveForm(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name?: string; schema?: FormSchema }) =>
      fetchJson<Form>(`/api/forms/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['forms', 'list'] }),
  });
}

export function useFormAction(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      action: 'publish' | 'unpublish' | 'republish' | 'archive' | 'duplicate' | 'slug';
      body?: unknown;
    }) => postJson<Form>(`/api/forms/${id}/${input.action}`, input.body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['forms'] });
      void queryClient.invalidateQueries({ queryKey: ['billing', 'usage'] });
    },
  });
}

export function useDeleteForm() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/forms/${id}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 204) {
        throw new Error(`Delete failed (${res.status})`);
      }
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['forms'] }),
  });
}
