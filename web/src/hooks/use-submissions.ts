// Author: Robert Massey | Created: 2026-07-13 | Module: Web / Submissions Hooks
// Purpose: TanStack Query hooks for the submissions data views, fed by the
// submissions BFF routes. Exports are plain downloads (not queries) — the
// browser handles them via a direct link to the BFF export route.

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

interface Envelope<T> {
  readonly success: boolean;
  readonly data: T;
  readonly error?: { readonly code: string; readonly message: string };
}

export type SubmissionStatusValue =
  'DRAFT' | 'SUBMITTED' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'OVER_LIMIT';

export interface SubmissionListItem {
  readonly id: string;
  readonly formId: string;
  readonly formVersion: number;
  readonly data: Record<string, unknown>;
  readonly status: SubmissionStatusValue;
  readonly submittedAt: string | null;
  readonly createdAt: string;
}

export interface PaginatedSubmissions {
  readonly submissions: SubmissionListItem[];
  readonly total: number;
  readonly quarantinedCount: number;
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init);
  const envelope = (await res.json()) as Envelope<T>;
  if (!res.ok || !envelope.success) {
    throw new Error(envelope.error?.message ?? `Request failed (${res.status})`);
  }
  return envelope.data;
}

export function useSubmissionsList(formId: string, page: number, pageSize = 25) {
  return useQuery({
    queryKey: ['submissions', formId, page, pageSize],
    queryFn: () =>
      fetchJson<PaginatedSubmissions>(
        `/api/forms/${formId}/submissions?page=${page}&pageSize=${pageSize}`,
      ),
    staleTime: 5_000,
  });
}

export function useDeleteSubmission(formId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/submissions/${id}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 204) {
        throw new Error(`Delete failed (${res.status})`);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['submissions', formId] });
      void queryClient.invalidateQueries({ queryKey: ['forms'] });
    },
  });
}

export function exportUrl(formId: string, format: 'csv' | 'xlsx'): string {
  return `/api/forms/${formId}/submissions/export?format=${format}`;
}
