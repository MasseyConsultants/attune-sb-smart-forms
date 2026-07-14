// Author: Robert Massey | Created: 2026-07-13 | Module: Web / Team Tests
// Member rows with role controls (OWNER + self locked), invite form,
// seat-cap 402 rendered as an UpgradeCta, pending invites section.

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { TeamView } from './team-view';

const OWNER = {
  id: 'user-1',
  email: 'owner@acme.test',
  firstName: 'Olive',
  lastName: 'Owner',
  role: 'OWNER',
  isActive: true,
  emailVerified: true,
  organizationId: 'org-1',
  createdAt: '2026-07-01T00:00:00Z',
  updatedAt: '2026-07-01T00:00:00Z',
};

const BUILDER = {
  ...OWNER,
  id: 'user-2',
  email: 'builder@acme.test',
  firstName: 'Bob',
  lastName: 'Builder',
  role: 'BUILDER',
};

const USAGE = {
  planId: 'trial',
  meters: [],
  counted: {
    activeForms: { used: 0, limit: 2 },
    uploadedTemplates: { used: 0, limit: 1 },
    users: { used: 2, limit: 2 },
  },
};

type FetchResponse = { ok: boolean; status: number; body: unknown };

function mockFetch(overrides: Record<string, FetchResponse> = {}): jest.Mock {
  const routes: Record<string, FetchResponse> = {
    'GET /api/users': { ok: true, status: 200, body: { success: true, data: [OWNER, BUILDER] } },
    'GET /api/invitations': { ok: true, status: 200, body: { success: true, data: [] } },
    'GET /api/billing/usage': { ok: true, status: 200, body: { success: true, data: USAGE } },
    ...overrides,
  };
  const mock = jest.fn((url: string, init?: RequestInit) => {
    const key = `${init?.method ?? 'GET'} ${url.split('?')[0]}`;
    const route = routes[key] ?? { ok: true, status: 200, body: { success: true, data: {} } };
    return Promise.resolve({
      ok: route.ok,
      status: route.status,
      json: () => Promise.resolve(route.body),
    });
  });
  global.fetch = mock as unknown as typeof fetch;
  return mock;
}

function renderTeam(): void {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <TeamView currentUserId="user-1" />
    </QueryClientProvider>,
  );
}

describe('TeamView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders members; the OWNER row has no role selector, the BUILDER row does', async () => {
    mockFetch();
    renderTeam();

    expect(await screen.findByText('builder@acme.test')).toBeInTheDocument();
    expect(screen.getByText('owner@acme.test')).toBeInTheDocument();
    expect(screen.queryByLabelText('Role for owner@acme.test')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Role for builder@acme.test')).toBeInTheDocument();
  });

  it('shows the seats meter from the usage summary', async () => {
    mockFetch();
    renderTeam();

    expect(await screen.findByText('2 of 2 used')).toBeInTheDocument();
  });

  it('sends an invite and confirms it', async () => {
    const fetchMock = mockFetch({
      'POST /api/invitations': {
        ok: true,
        status: 201,
        body: { success: true, data: { id: 'inv-1', email: 'nina@acme.test' } },
      },
    });
    renderTeam();
    await screen.findByText('builder@acme.test');

    fireEvent.change(screen.getByPlaceholderText('First name'), { target: { value: 'Nina' } });
    fireEvent.change(screen.getByPlaceholderText('Last name'), { target: { value: 'New' } });
    fireEvent.change(screen.getByPlaceholderText('email@company.com'), {
      target: { value: 'nina@acme.test' },
    });
    fireEvent.click(screen.getByRole('button', { name: /send invite/i }));

    expect(await screen.findByText('Invitation sent to nina@acme.test.')).toBeInTheDocument();
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/invitations',
        expect.objectContaining({ method: 'POST' }),
      ),
    );
  });

  it('renders the upgrade CTA when the invite hits the seat cap (402)', async () => {
    mockFetch({
      'POST /api/invitations': {
        ok: false,
        status: 402,
        body: {
          success: false,
          error: {
            code: 'LIMIT_EXCEEDED',
            message: 'Seat limit reached',
            details: { limit: 2, current: 2, upgradeUrl: '/billing' },
          },
        },
      },
    });
    renderTeam();
    await screen.findByText('builder@acme.test');

    fireEvent.change(screen.getByPlaceholderText('First name'), { target: { value: 'Nina' } });
    fireEvent.change(screen.getByPlaceholderText('Last name'), { target: { value: 'New' } });
    fireEvent.change(screen.getByPlaceholderText('email@company.com'), {
      target: { value: 'nina@acme.test' },
    });
    fireEvent.click(screen.getByRole('button', { name: /send invite/i }));

    expect(await screen.findByRole('link', { name: /upgrade/i })).toHaveAttribute(
      'href',
      '/billing',
    );
  });

  it('lists pending invites with resend and revoke actions', async () => {
    mockFetch({
      'GET /api/invitations': {
        ok: true,
        status: 200,
        body: {
          success: true,
          data: [
            {
              id: 'inv-1',
              email: 'pending@acme.test',
              firstName: 'Pat',
              lastName: 'Pending',
              role: 'VIEWER',
              orgId: 'org-1',
              invitedById: 'user-1',
              expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
              acceptedAt: null,
              createdAt: new Date().toISOString(),
            },
          ],
        },
      },
    });
    renderTeam();

    expect(await screen.findByText('pending@acme.test')).toBeInTheDocument();
    expect(screen.getByLabelText('Resend invite to pending@acme.test')).toBeInTheDocument();
    expect(screen.getByLabelText('Revoke invite to pending@acme.test')).toBeInTheDocument();
  });
});
