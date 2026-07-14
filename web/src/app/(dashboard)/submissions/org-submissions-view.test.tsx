// Author: Robert Massey | Created: 2026-07-14 | Module: Web / Submissions Tests
// Org-wide data view: rows with form names, form filter driving the export
// URL, search round-trip, member filter hidden when the API denies /users.

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { OrgSubmissionsView } from './org-submissions-view';

const SUBMISSION = {
  id: 'sub-1',
  formId: 'form-1',
  formVersion: 1,
  data: { name: 'Ada Lovelace', email: 'ada@acme.test' },
  status: 'SUBMITTED',
  submittedAt: '2026-07-14T12:00:00Z',
  createdAt: '2026-07-14T12:00:00Z',
  hasFilledDocument: false,
  formName: 'Work Order Request',
  formCreatedById: 'user-1',
};

type FetchResponse = { ok: boolean; status: number; body: unknown };

function mockFetch(overrides: Record<string, FetchResponse> = {}): jest.Mock {
  const routes: Record<string, FetchResponse> = {
    '/api/submissions': {
      ok: true,
      status: 200,
      body: { success: true, data: { submissions: [SUBMISSION], total: 1, quarantinedCount: 0 } },
    },
    '/api/forms': {
      ok: true,
      status: 200,
      body: {
        success: true,
        data: { forms: [{ id: 'form-1', name: 'Work Order Request' }], total: 1 },
      },
    },
    '/api/users': {
      ok: true,
      status: 200,
      body: {
        success: true,
        data: [
          {
            id: 'user-1',
            email: 'owner@acme.test',
            firstName: 'Olive',
            lastName: 'Owner',
            role: 'OWNER',
            isActive: true,
            emailVerified: true,
            organizationId: 'org-1',
            createdAt: '',
            updatedAt: '',
          },
        ],
      },
    },
    ...overrides,
  };
  const mock = jest.fn((url: string) => {
    const path = url.split('?')[0];
    const route = routes[path] ?? { ok: true, status: 200, body: { success: true, data: {} } };
    return Promise.resolve({
      ok: route.ok,
      status: route.status,
      json: () => Promise.resolve(route.body),
    });
  });
  global.fetch = mock as unknown as typeof fetch;
  return mock;
}

function renderView(): void {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <OrgSubmissionsView />
    </QueryClientProvider>,
  );
}

describe('OrgSubmissionsView', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders rows with the form name and a data preview', async () => {
    mockFetch();
    renderView();

    expect(await screen.findByRole('link', { name: /Work Order Request/ })).toBeInTheDocument();
    expect(screen.getByText(/Ada Lovelace/)).toBeInTheDocument();
    expect(screen.getByText('SUBMITTED')).toBeInTheDocument();
  });

  it('export URL targets the org-wide CSV by default, the form CSV when filtered', async () => {
    mockFetch();
    renderView();
    await screen.findByRole('link', { name: /Work Order Request/ });

    const exportLink = screen.getByRole('link', { name: /export csv/i });
    expect(exportLink).toHaveAttribute('href', '/api/submissions/export');

    fireEvent.change(screen.getByLabelText('Filter by form'), { target: { value: 'form-1' } });
    await waitFor(() =>
      expect(screen.getByRole('link', { name: /export csv/i })).toHaveAttribute(
        'href',
        '/api/forms/form-1/submissions/export?format=csv',
      ),
    );
  });

  it('search submits on Enter and forwards q to the API', async () => {
    const fetchMock = mockFetch();
    renderView();
    await screen.findByRole('link', { name: /Work Order Request/ });

    const input = screen.getByPlaceholderText('Search values… (Enter)');
    fireEvent.change(input, { target: { value: 'Ada' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() =>
      expect(fetchMock.mock.calls.some((call) => String(call[0]).includes('q=Ada'))).toBe(true),
    );
  });

  it('hides the team member filter when the members API denies access', async () => {
    mockFetch({
      '/api/users': {
        ok: false,
        status: 403,
        body: { success: false, error: { code: 'FORBIDDEN', message: 'Admins only' } },
      },
    });
    renderView();
    await screen.findByRole('link', { name: /Work Order Request/ });

    expect(screen.queryByLabelText('Filter by team member')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Filter by form')).toBeInTheDocument();
  });

  it('shows the empty state with filter guidance when a search matches nothing', async () => {
    mockFetch({
      '/api/submissions': {
        ok: true,
        status: 200,
        body: { success: true, data: { submissions: [], total: 0, quarantinedCount: 0 } },
      },
    });
    renderView();

    expect(await screen.findByText('No submissions found')).toBeInTheDocument();
  });
});
