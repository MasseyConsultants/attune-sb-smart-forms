// Author: Robert Massey | Created: 2026-07-13 | Module: Web / Forms List Tests

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';

import { FormStatus } from '@attune-sb/shared-types';

import { FormsList } from './forms-list';

const push = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

function renderList(): void {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <FormsList />
    </QueryClientProvider>,
  );
}

function mockFetchForms(forms: unknown[]): void {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ success: true, data: { forms, total: forms.length } }),
  }) as unknown as typeof fetch;
}

describe('FormsList', () => {
  it('renders the empty state with a create button', async () => {
    mockFetchForms([]);
    renderList();

    expect(await screen.findByText('No forms yet')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /new form/i }).length).toBeGreaterThan(0);
  });

  it('renders form rows with status, version, and builder links', async () => {
    mockFetchForms([
      {
        id: 'f-1',
        name: 'Customer Intake',
        description: 'New client onboarding',
        slug: 'abc',
        status: FormStatus.PUBLISHED,
        version: 3,
        organizationId: 'org-1',
        schema: null,
        createdAt: '2026-07-13T00:00:00Z',
        updatedAt: '2026-07-13T00:00:00Z',
      },
      {
        id: 'f-2',
        name: 'Feedback',
        description: null,
        slug: 'def',
        status: FormStatus.DRAFT,
        version: 1,
        organizationId: 'org-1',
        schema: null,
        createdAt: '2026-07-13T00:00:00Z',
        updatedAt: '2026-07-13T00:00:00Z',
      },
    ]);
    renderList();

    const link = await screen.findByRole('link', { name: 'Customer Intake' });
    expect(link).toHaveAttribute('href', '/forms/f-1');
    expect(screen.getByText('PUBLISHED')).toBeInTheDocument();
    expect(screen.getByText('DRAFT')).toBeInTheDocument();
    expect(screen.getByText('v3')).toBeInTheDocument();
    expect(screen.getByText('2 forms')).toBeInTheDocument();
  });

  it('surfaces load failures', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () =>
        Promise.resolve({ success: false, error: { code: 'X', message: 'API unreachable' } }),
    }) as unknown as typeof fetch;
    renderList();

    expect(await screen.findByText(/could not load forms/i)).toBeInTheDocument();
  });
});
