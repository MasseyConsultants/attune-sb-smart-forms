// Author: Robert Massey | Created: 2026-07-13 | Module: Web / Notifications Tests
// Bell badge count, dropdown feed, mark-read on open, and mark-all-read.

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { NotificationsBell } from './notifications-bell';

function makeItem(overrides: Record<string, unknown> = {}) {
  return {
    id: 'ntf-1',
    type: 'usage_warning',
    title: 'Submissions at 80%',
    body: 'You have used 80 of 100 submissions this period.',
    link: '/billing',
    readAt: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function mockFetch(notifications: unknown[], unreadCount: number): jest.Mock {
  const mock = jest.fn((url: string, init?: RequestInit) => {
    if ((init?.method ?? 'GET') === 'GET') {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            success: true,
            data: { notifications, total: notifications.length, unreadCount },
          }),
      });
    }
    return Promise.resolve({ ok: true, status: 204, json: () => Promise.resolve({}) });
  });
  global.fetch = mock as unknown as typeof fetch;
  return mock;
}

function renderBell(): void {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <NotificationsBell />
    </QueryClientProvider>,
  );
}

describe('NotificationsBell', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows the unread badge count', async () => {
    mockFetch([makeItem()], 3);
    renderBell();

    expect(
      await screen.findByRole('button', { name: 'Notifications (3 unread)' }),
    ).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('caps the badge at 9+', async () => {
    mockFetch([makeItem()], 12);
    renderBell();

    expect(await screen.findByText('9+')).toBeInTheDocument();
  });

  it('opens the dropdown and renders notification rows', async () => {
    mockFetch([makeItem()], 1);
    renderBell();

    fireEvent.click(await screen.findByRole('button', { name: /notifications/i }));

    expect(await screen.findByText('Submissions at 80%')).toBeInTheDocument();
    expect(screen.getByText(/80 of 100 submissions/)).toBeInTheDocument();
  });

  it('shows the empty state when the feed is empty', async () => {
    mockFetch([], 0);
    renderBell();

    fireEvent.click(await screen.findByRole('button', { name: 'Notifications' }));

    expect(await screen.findByText(/Nothing yet/)).toBeInTheDocument();
  });

  it('marks an unread notification read when opened', async () => {
    const fetchMock = mockFetch([makeItem()], 1);
    renderBell();

    fireEvent.click(await screen.findByRole('button', { name: /notifications/i }));
    fireEvent.click(await screen.findByText('Submissions at 80%'));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/notifications/ntf-1/read',
        expect.objectContaining({ method: 'POST' }),
      ),
    );
  });

  it('marks everything read via the header action', async () => {
    const fetchMock = mockFetch([makeItem(), makeItem({ id: 'ntf-2' })], 2);
    renderBell();

    fireEvent.click(await screen.findByRole('button', { name: /notifications/i }));
    fireEvent.click(await screen.findByRole('button', { name: /mark all read/i }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/notifications/read-all',
        expect.objectContaining({ method: 'POST' }),
      ),
    );
  });
});
