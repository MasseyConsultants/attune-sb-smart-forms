// Author: Robert Massey | Created: 2026-07-13 | Module: Web / Admin Hooks
// Purpose: TanStack Query hooks for the PLATFORM_ADMIN console (SB-016).

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  AdminOrgDetail,
  AdminOrgSummary,
  CreateOverrideRequest,
  InvitePlatformAdminRequest,
  PlatformStaffSummary,
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

export function useAdminOrgs(search?: string, lifecycleState?: string) {
  const params = new URLSearchParams({ pageSize: '50' });
  if (search) params.set('search', search);
  if (lifecycleState) params.set('lifecycleState', lifecycleState);
  return useQuery({
    queryKey: ['admin', 'orgs', search ?? '', lifecycleState ?? ''],
    queryFn: () =>
      fetchEnvelope<{ orgs: AdminOrgSummary[]; total: number }>(`/api/admin/orgs?${params}`),
    staleTime: 15_000,
  });
}

export function useAdminOrg(id: string) {
  return useQuery({
    queryKey: ['admin', 'orgs', id],
    queryFn: () => fetchEnvelope<AdminOrgDetail>(`/api/admin/orgs/${id}`),
    staleTime: 0,
  });
}

function useOrgAction(id: string) {
  const queryClient = useQueryClient();
  return {
    invalidate: (): void => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'orgs'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'orgs', id] });
    },
  };
}

export function useSetLegalHold(id: string) {
  const { invalidate } = useOrgAction(id);
  return useMutation({
    mutationFn: (hold: boolean) =>
      fetchEnvelope<void>(`/api/admin/orgs/${id}/legal-hold`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hold }),
      }),
    onSuccess: invalidate,
  });
}

export function useRestoreOrg(id: string) {
  const { invalidate } = useOrgAction(id);
  return useMutation({
    mutationFn: () => fetchEnvelope<void>(`/api/admin/orgs/${id}/restore`, { method: 'POST' }),
    onSuccess: invalidate,
  });
}

export function useCreateOverride(id: string) {
  const { invalidate } = useOrgAction(id);
  return useMutation({
    mutationFn: (input: CreateOverrideRequest) =>
      fetchEnvelope<void>(`/api/admin/orgs/${id}/overrides`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }),
    onSuccess: invalidate,
  });
}

export function useDeleteOverride(id: string) {
  const { invalidate } = useOrgAction(id);
  return useMutation({
    mutationFn: (overrideId: string) =>
      fetchEnvelope<void>(`/api/admin/orgs/${id}/overrides/${overrideId}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });
}

export function usePlatformStaff() {
  return useQuery({
    queryKey: ['admin', 'platform-staff'],
    queryFn: () => fetchEnvelope<PlatformStaffSummary>('/api/admin/platform-staff'),
    staleTime: 10_000,
  });
}

function useStaffInvalidate() {
  const queryClient = useQueryClient();
  return (): void => {
    void queryClient.invalidateQueries({ queryKey: ['admin', 'platform-staff'] });
  };
}

export function useInvitePlatformAdmin() {
  const invalidate = useStaffInvalidate();
  return useMutation({
    mutationFn: (input: InvitePlatformAdminRequest) =>
      fetchEnvelope<{ id: string; email: string }>('/api/admin/platform-staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }),
    onSuccess: invalidate,
  });
}

export function useGrantPlatformAdmin() {
  const invalidate = useStaffInvalidate();
  return useMutation({
    mutationFn: (userId: string) =>
      fetchEnvelope<void>(`/api/admin/platform-staff/${userId}/grant`, { method: 'POST' }),
    onSuccess: invalidate,
  });
}

export function useRevokePlatformAdmin() {
  const invalidate = useStaffInvalidate();
  return useMutation({
    mutationFn: (userId: string) =>
      fetchEnvelope<void>(`/api/admin/platform-staff/${userId}/revoke`, { method: 'POST' }),
    onSuccess: invalidate,
  });
}
