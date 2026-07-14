// Author: Robert Massey | Created: 2026-07-13 | Module: Web / Team Hooks
// Purpose: TanStack Query hooks for team management (SB-018) — members,
// pending invites, role changes, deactivation. Invite creation surfaces the
// seat-cap 402 as LimitExceededError so the UI renders the upgrade prompt.

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { CreateInviteRequest, Role, TeamInvite, UserProfile } from '@attune-sb/shared-types';

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
  if (res.status === 204) {
    return undefined as T;
  }
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

export function useTeamMembers() {
  return useQuery({
    queryKey: ['team', 'members'],
    queryFn: async () => parseEnvelope<UserProfile[]>(await fetch('/api/users')),
    staleTime: 30_000,
  });
}

export function usePendingInvites() {
  return useQuery({
    queryKey: ['team', 'invites'],
    queryFn: async () => parseEnvelope<TeamInvite[]>(await fetch('/api/invitations')),
    staleTime: 30_000,
  });
}

function useTeamInvalidation() {
  const queryClient = useQueryClient();
  return (): void => {
    void queryClient.invalidateQueries({ queryKey: ['team'] });
    // Seats meter lives in the billing usage summary.
    void queryClient.invalidateQueries({ queryKey: ['billing', 'usage'] });
  };
}

/** Throws LimitExceededError at the plan's seat cap (maxUsers). */
export function useCreateInvite() {
  const invalidate = useTeamInvalidation();
  return useMutation({
    mutationFn: async (input: CreateInviteRequest) =>
      parseEnvelope<{ id: string; email: string }>(
        await fetch('/api/invitations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        }),
      ),
    onSuccess: invalidate,
  });
}

export function useUpdateMemberRole() {
  const invalidate = useTeamInvalidation();
  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: Role }) =>
      parseEnvelope<UserProfile>(
        await fetch(`/api/users/${userId}/role`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role }),
        }),
      ),
    onSuccess: invalidate,
  });
}

export function useDeactivateMember() {
  const invalidate = useTeamInvalidation();
  return useMutation({
    mutationFn: async (userId: string) =>
      parseEnvelope<{ removed: true }>(await fetch(`/api/users/${userId}`, { method: 'DELETE' })),
    onSuccess: invalidate,
  });
}

export function useResendInvite() {
  const invalidate = useTeamInvalidation();
  return useMutation({
    mutationFn: async (inviteId: string) =>
      parseEnvelope<{ id: string; email: string }>(
        await fetch(`/api/invitations/${inviteId}/resend`, { method: 'POST' }),
      ),
    onSuccess: invalidate,
  });
}

export function useRevokeInvite() {
  const invalidate = useTeamInvalidation();
  return useMutation({
    mutationFn: async (inviteId: string) =>
      parseEnvelope<{ revoked: true }>(
        await fetch(`/api/invitations/${inviteId}`, { method: 'DELETE' }),
      ),
    onSuccess: invalidate,
  });
}
