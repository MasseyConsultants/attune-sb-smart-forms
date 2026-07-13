// Author: Robert Massey | Created: 2026-07-13 | Module: Web / Submissions View Tests

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';

import { SubmissionsView } from './submissions-view';

const FORM = {
  id: 'f-1',
  name: 'Customer Intake',
  description: null,
  slug: 'abc',
  status: 'PUBLISHED',
  version: 2,
  organizationId: 'org-1',
  schema: {
    fields: [
      { id: 'name', type: 'text', label: 'Name', required: true, config: {}, sortOrder: 0 },
      { id: 'sec', type: 'section', label: 'Layout', required: false, config: {}, sortOrder: 1 },
      { id: 'email', type: 'email', label: 'Email', required: false, config: {}, sortOrder: 2 },
    ],
  },
  createdAt: '2026-07-13T00:00:00Z',
  updatedAt: '2026-07-13T00:00:00Z',
};

function mockFetch(payload: {
  submissions: unknown[];
  total: number;
  quarantinedCount: number;
}): void {
  global.fetch = jest.fn().mockImplementation((input: RequestInfo | URL) => {
    const url = String(input);
    const data = url.includes('/submissions') ? payload : FORM;
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ success: true, data }),
    });
  }) as unknown as typeof fetch;
}

function renderView(): void {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <SubmissionsView formId="f-1" />
    </QueryClientProvider>,
  );
}

describe('SubmissionsView', () => {
  it('renders the empty state', async () => {
    mockFetch({ submissions: [], total: 0, quarantinedCount: 0 });
    renderView();

    expect(await screen.findByText('No submissions yet')).toBeInTheDocument();
    expect(screen.getByText('0 submissions')).toBeInTheDocument();
  });

  it('renders rows with schema-derived columns, excluding layout fields', async () => {
    mockFetch({
      submissions: [
        {
          id: 's-1',
          formId: 'f-1',
          formVersion: 2,
          data: { name: 'Ada Lovelace', email: 'ada@x.io' },
          status: 'SUBMITTED',
          submittedAt: '2026-07-13T10:00:00Z',
          createdAt: '2026-07-13T10:00:00Z',
        },
      ],
      total: 1,
      quarantinedCount: 0,
    });
    renderView();

    expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Email' })).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Layout' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /csv/i })).toHaveAttribute(
      'href',
      '/api/forms/f-1/submissions/export?format=csv',
    );
  });

  it('shows the quarantine banner with an upgrade link', async () => {
    mockFetch({ submissions: [], total: 0, quarantinedCount: 4 });
    renderView();

    expect(
      await screen.findByText(/4 submissions were received over your plan limit/i),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /upgrade plan/i })).toHaveAttribute('href', '/billing');
  });
});
