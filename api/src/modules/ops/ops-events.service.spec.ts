// Author: Robert Massey | Created: 2026-07-16 | Module: Ops / Tests
// Ledger invariants: recording never throws (fire-and-forget), messages are
// truncated, prune uses the retention cutoff, list maps rows to the contract.

import { OpsEventsService } from './ops-events.service';

const repository = {
  createEvent: jest.fn(),
  findEvents: jest.fn(),
  deleteEventsBefore: jest.fn(),
};

const logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };

function makeService(): OpsEventsService {
  // Reason: structural mocks stand in for Nest providers in unit tests.
  return new OpsEventsService(repository as any, logger as any);
}

beforeEach(() => {
  jest.clearAllMocks();
  repository.createEvent.mockResolvedValue({});
});

async function flushMicrotasks(): Promise<void> {
  await new Promise((resolve) => setImmediate(resolve));
}

describe('record', () => {
  it('persists the event with defaults applied', async () => {
    const service = makeService();

    service.record({
      kind: 'API_ERROR',
      severity: 'ERROR',
      type: 'http.5xx',
      message: 'boom',
      statusCode: 500,
      path: '/api/v1/forms',
    });
    await flushMicrotasks();

    expect(repository.createEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'API_ERROR',
        type: 'http.5xx',
        statusCode: 500,
        organizationId: null,
        userId: null,
      }),
    );
  });

  it('truncates oversized messages', async () => {
    const service = makeService();

    service.record({
      kind: 'API_ERROR',
      severity: 'ERROR',
      type: 'http.5xx',
      message: 'x'.repeat(5000),
    });
    await flushMicrotasks();

    const arg = repository.createEvent.mock.calls[0][0];
    expect(arg.message).toHaveLength(2000);
  });

  it('never throws when persistence fails — logs instead', async () => {
    repository.createEvent.mockRejectedValue(new Error('db down'));
    const service = makeService();

    expect(() =>
      service.record({ kind: 'SECURITY', severity: 'WARNING', type: 'authz.denied', message: 'x' }),
    ).not.toThrow();
    await flushMicrotasks();

    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('ops_event.persist_failed'),
      undefined,
      'OpsEventsService',
    );
  });
});

describe('security helper', () => {
  it('defaults to a WARNING security event', async () => {
    const service = makeService();

    service.security('auth.account_locked', 'locked', { userId: 'user-1' });
    await flushMicrotasks();

    expect(repository.createEvent).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'SECURITY', severity: 'WARNING', userId: 'user-1' }),
    );
  });
});

describe('list', () => {
  it('maps rows to the AdminOpsEvent contract', async () => {
    repository.findEvents.mockResolvedValue({
      events: [
        {
          id: 'evt-1',
          kind: 'SECURITY',
          severity: 'CRITICAL',
          type: 'auth.refresh_reuse',
          message: 'reuse',
          statusCode: null,
          method: null,
          path: null,
          requestId: null,
          organizationId: 'org-1',
          userId: 'user-1',
          ip: null,
          context: { family: 'fam-1' },
          createdAt: new Date('2026-07-16T00:00:00Z'),
        },
      ],
      total: 1,
    });
    const service = makeService();

    const page = await service.list({ page: 1, pageSize: 50 });

    expect(page.total).toBe(1);
    expect(page.events[0].createdAt).toBe('2026-07-16T00:00:00.000Z');
    expect(page.events[0].type).toBe('auth.refresh_reuse');
  });
});

describe('prune', () => {
  it('deletes rows older than the retention window', async () => {
    repository.deleteEventsBefore.mockResolvedValue(12);
    const service = makeService();
    const before = Date.now();

    const deleted = await service.prune(30);

    expect(deleted).toBe(12);
    const cutoff = repository.deleteEventsBefore.mock.calls[0][0] as Date;
    const expected = before - 30 * 24 * 60 * 60 * 1000;
    expect(Math.abs(cutoff.getTime() - expected)).toBeLessThan(5000);
  });
});
