// Author: Robert Massey | Created: 2026-07-13 | Module: Web / Templates Hooks
// Purpose: TanStack Query hooks for SmartMapper document templates.
// LIMIT_EXCEEDED responses surface as LimitExceededError so the upload flow
// can render the upgrade prompt instead of a generic failure.

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  AutoMapResult,
  DocumentTemplateDetail,
  DocumentTemplateSummary,
  FieldCoordinateMapping,
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

export function useTemplatesList() {
  return useQuery({
    queryKey: ['templates', 'list'],
    queryFn: () => fetchJson<DocumentTemplateSummary[]>('/api/templates'),
    staleTime: 15_000,
  });
}

export function useTemplate(id: string) {
  return useQuery({
    queryKey: ['templates', id],
    queryFn: () => fetchJson<DocumentTemplateDetail>(`/api/templates/${id}`),
    staleTime: 0,
  });
}

export function useUploadTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { file: File; name?: string; formId?: string }) => {
      const formData = new FormData();
      formData.append('file', input.file);
      if (input.name) {
        formData.append('name', input.name);
      }
      if (input.formId) {
        formData.append('formId', input.formId);
      }
      const res = await fetch('/api/templates', { method: 'POST', body: formData });
      return parseEnvelope<DocumentTemplateDetail>(res);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['templates'] });
      void queryClient.invalidateQueries({ queryKey: ['billing', 'usage'] });
    },
  });
}

export function useUpdateTemplate(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name?: string; formId?: string | null }) =>
      fetchJson<DocumentTemplateDetail>(`/api/templates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['templates'] }),
  });
}

export function useSaveMappings(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (mappings: FieldCoordinateMapping[]) =>
      fetchJson<DocumentTemplateDetail>(`/api/templates/${id}/mappings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mappings }),
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(['templates', id], data);
      void queryClient.invalidateQueries({ queryKey: ['templates', 'list'] });
    },
  });
}

export function useSuggestMappings(id: string) {
  return useMutation({
    mutationFn: () =>
      fetchJson<AutoMapResult>(`/api/templates/${id}/suggest-mappings`, { method: 'POST' }),
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/templates/${id}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 204) {
        throw new Error(`Delete failed (${res.status})`);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['templates'] });
      void queryClient.invalidateQueries({ queryKey: ['billing', 'usage'] });
    },
  });
}
