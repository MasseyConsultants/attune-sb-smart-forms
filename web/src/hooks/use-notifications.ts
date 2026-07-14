// Author: Robert Massey | Created: 2026-07-13 | Module: Web / Notifications Hooks

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { NotificationsList } from '@attune-sb/shared-types';

interface Envelope<T> {
  readonly success: boolean;
  readonly data: T;
  readonly error?: { readonly code: string; readonly message: string };
}

export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: async (): Promise<NotificationsList> => {
      const res = await fetch('/api/notifications?pageSize=20');
      const envelope = (await res.json()) as Envelope<NotificationsList>;
      if (!res.ok || !envelope.success) {
        throw new Error(envelope.error?.message ?? 'Failed to load notifications');
      }
      return envelope.data;
    },
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/notifications/${id}/read`, { method: 'POST' });
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await fetch('/api/notifications/read-all', { method: 'POST' });
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });
}
