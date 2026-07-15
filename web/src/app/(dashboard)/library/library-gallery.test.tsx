// Author: Robert Massey | Created: 2026-07-13 | Module: Web / Library Tests
// Gallery cards render template facts, clone routes to the new draft form,
// and a clone failure surfaces inline instead of navigating.

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { LibraryGallery } from './library-gallery';

const push = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

const TEMPLATE = {
  id: 'tpl-1',
  slug: 'client-intake-ab12',
  name: 'Client Intake',
  description: 'Collect new client details',
  category: 'intake',
  scope: 'PUBLIC',
  fieldCount: 8,
  pageCount: 2,
  hasWorkflow: true,
  hasDocument: false,
  installCount: 12,
  createdAt: '2026-07-13T00:00:00Z',
};

type FetchResponse = { ok: boolean; status: number; body: unknown };

function mockFetch(routes: Record<string, FetchResponse>): jest.Mock {
  const mock = jest.fn((url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET';
    const key = `${method} ${url.split('?')[0]}`;
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

function renderGallery(): void {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <LibraryGallery />
    </QueryClientProvider>,
  );
}

const BASE_ROUTES: Record<string, FetchResponse> = {
  'GET /api/library': {
    ok: true,
    status: 200,
    body: { success: true, data: { templates: [TEMPLATE], total: 1 } },
  },
  'GET /api/library/org': {
    ok: true,
    status: 200,
    body: { success: true, data: { templates: [], total: 0 } },
  },
};

describe('LibraryGallery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders template cards with field count, pages, and workflow badge', async () => {
    mockFetch(BASE_ROUTES);
    renderGallery();

    // Wait for the card itself — "Client Intake" alone also matches the category pill.
    expect(await screen.findByRole('button', { name: /use this template/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Client Intake' })).toBeInTheDocument();
    // Field/page facts render as sibling text nodes inside one span.
    expect(
      screen.getByText(
        (_, node) =>
          node?.tagName === 'SPAN' && /8 fields\s*·\s*2 pages/.test(node.textContent ?? ''),
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('Includes workflow')).toBeInTheDocument();
  });

  it('clones on "Use this template" and routes to the new draft form', async () => {
    mockFetch({
      ...BASE_ROUTES,
      'POST /api/library/tpl-1/clone': {
        ok: true,
        status: 201,
        body: {
          success: true,
          data: { formId: 'form-9', formName: 'Client Intake', workflowId: 'wf-9' },
        },
      },
    });
    renderGallery();

    fireEvent.click(await screen.findByRole('button', { name: /use this template/i }));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/forms/form-9'));
  });

  it('shows an inline error when the clone fails', async () => {
    mockFetch({
      ...BASE_ROUTES,
      'POST /api/library/tpl-1/clone': {
        ok: false,
        status: 404,
        body: { success: false, error: { code: 'NOT_FOUND', message: 'Template not found' } },
      },
    });
    renderGallery();

    fireEvent.click(await screen.findByRole('button', { name: /use this template/i }));

    expect(await screen.findByText('Template not found')).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it('shows the empty state when no templates match the filter', async () => {
    mockFetch({
      ...BASE_ROUTES,
      'GET /api/library': {
        ok: true,
        status: 200,
        body: { success: true, data: { templates: [], total: 0 } },
      },
    });
    renderGallery();

    expect(await screen.findByText('No templates match that filter.')).toBeInTheDocument();
  });
});
