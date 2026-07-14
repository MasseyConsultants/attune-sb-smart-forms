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
  /** True when a SmartMapper filled PDF exists for download. */
  readonly hasFilledDocument: boolean;
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

export interface OrgSubmissionItem extends SubmissionListItem {
  readonly formName: string;
  readonly formCreatedById: string;
}

export interface PaginatedOrgSubmissions {
  readonly submissions: OrgSubmissionItem[];
  readonly total: number;
  readonly quarantinedCount: number;
}

export interface OrgSubmissionsFilters {
  readonly formId?: string;
  readonly createdById?: string;
  readonly q?: string;
}

function orgQueryString(filters: OrgSubmissionsFilters, page: number, pageSize: number): string {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (filters.formId) params.set('formId', filters.formId);
  if (filters.createdById) params.set('createdById', filters.createdById);
  if (filters.q?.trim()) params.set('q', filters.q.trim());
  return params.toString();
}

/** Org-wide data view across every form. */
export function useOrgSubmissions(filters: OrgSubmissionsFilters, page: number, pageSize = 25) {
  return useQuery({
    queryKey: ['submissions', 'org', filters, page, pageSize],
    queryFn: () =>
      fetchJson<PaginatedOrgSubmissions>(
        `/api/submissions?${orgQueryString(filters, page, pageSize)}`,
      ),
    staleTime: 5_000,
  });
}

/** Org-wide CSV export URL honouring the active filters. */
export function orgExportUrl(filters: OrgSubmissionsFilters): string {
  const params = new URLSearchParams();
  if (filters.formId) params.set('formId', filters.formId);
  if (filters.createdById) params.set('createdById', filters.createdById);
  if (filters.q?.trim()) params.set('q', filters.q.trim());
  const query = params.toString();
  return `/api/submissions/export${query ? `?${query}` : ''}`;
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

/** Download URL for the SmartMapper-filled PDF of a submission. */
export function filledDocumentUrl(submissionId: string): string {
  return `/api/submissions/${submissionId}/document`;
}
