// Author: Robert Massey | Created: 2026-07-13 | Module: Web / Library Hooks
// Purpose: TanStack Query hooks for the template gallery — browse (curated +
// org), one-click clone, and publish-to-org (surfaces LIMIT_EXCEEDED as
// LimitExceededError so the UI renders the upgrade prompt).

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  CloneTemplateResponse,
  LibraryTemplateDetail,
  LibraryTemplateSummary,
  PublishOrgTemplateRequest,
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

interface LibraryList {
  readonly templates: LibraryTemplateSummary[];
  readonly total: number;
}

export function useGalleryTemplates(category?: string, search?: string) {
  const params = new URLSearchParams({ pageSize: '100' });
  if (category) params.set('category', category);
  if (search) params.set('search', search);
  return useQuery({
    queryKey: ['library', 'public', category ?? 'all', search ?? ''],
    queryFn: async () => parseEnvelope<LibraryList>(await fetch(`/api/library?${params}`)),
    staleTime: 60_000,
  });
}

export function useOrgTemplates() {
  return useQuery({
    queryKey: ['library', 'org'],
    queryFn: async () => parseEnvelope<LibraryList>(await fetch('/api/library/org?pageSize=100')),
    staleTime: 30_000,
  });
}

export function useCloneTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (templateId: string) =>
      parseEnvelope<CloneTemplateResponse>(
        await fetch(`/api/library/${templateId}/clone`, { method: 'POST' }),
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['forms'] });
      void queryClient.invalidateQueries({ queryKey: ['workflows'] });
    },
  });
}

/** Throws LimitExceededError when the org's plan lacks publishOrgTemplates. */
export function usePublishOrgTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: PublishOrgTemplateRequest) =>
      parseEnvelope<LibraryTemplateDetail>(
        await fetch('/api/library/publish', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        }),
      ),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['library', 'org'] }),
  });
}

export function useDeleteOrgTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/library/org/${id}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 204) {
        throw new Error(`Delete failed (${res.status})`);
      }
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['library', 'org'] }),
  });
}
