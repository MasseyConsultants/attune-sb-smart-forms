// Author: Robert Massey | Created: 2026-07-13 | Module: notifications / Tests
// The one hard contract: emit() never throws — a feed write must never fail
// the action that produced it. Plus scoping delegation for reads/mark-read.

import { InAppNotificationsService } from './in-app-notifications.service';

const repository = {
  create: jest.fn(),
  findMany: jest.fn(),
  markRead: jest.fn(),
  markAllRead: jest.fn(),
  pruneOld: jest.fn(),
};

const logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };

function makeService(): InAppNotificationsService {
  // Reason: structural mocks stand in for Nest providers in unit tests.
  return new InAppNotificationsService(repository as any, logger as any);
}

function makeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'ntf-1',
    type: 'usage_warning',
    title: 'Submissions at 80%',
    body: 'You have used 80 of 100 submissions this period.',
    link: '/billing',
    organizationId: 'org-1',
    userId: null,
    readAt: null,
    createdAt: new Date('2026-07-13T00:00:00Z'),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  repository.pruneOld.mockResolvedValue(undefined);
});

describe('emit', () => {
  it('writes an org-wide notification (userId null) by default', async () => {
    repository.create.mockResolvedValue(makeRow());
    const service = makeService();

    await service.emit({
      organizationId: 'org-1',
      type: 'usage_warning',
      title: 'Submissions at 80%',
      body: 'body',
      link: '/billing',
    });

    expect(repository.create).toHaveBeenCalledWith({
      organizationId: 'org-1',
      userId: null,
      type: 'usage_warning',
      title: 'Submissions at 80%',
      body: 'body',
      link: '/billing',
    });
  });

  it('never throws when the repository write fails — logs instead', async () => {
    repository.create.mockRejectedValue(new Error('db down'));
    const service = makeService();

    await expect(
      service.emit({ organizationId: 'org-1', type: 'workflow_failed', title: 't', body: 'b' }),
    ).resolves.toBeUndefined();
    expect(logger.error).toHaveBeenCalled();
  });
});

describe('list / markRead', () => {
  it('maps rows to items and passes through counts', async () => {
    repository.findMany.mockResolvedValue({
      notifications: [
        makeRow(),
        makeRow({ id: 'ntf-2', readAt: new Date('2026-07-13T01:00:00Z') }),
      ],
      total: 2,
      unreadCount: 1,
    });
    const service = makeService();

    const result = await service.list('org-1', 'user-1', 1, 20);

    expect(repository.findMany).toHaveBeenCalledWith('org-1', 'user-1', 1, 20);
    expect(result.total).toBe(2);
    expect(result.unreadCount).toBe(1);
    expect(result.notifications[0]).toEqual(expect.objectContaining({ id: 'ntf-1', readAt: null }));
    expect(result.notifications[1].readAt).toBe('2026-07-13T01:00:00.000Z');
  });

  it('markRead scopes by org and user', async () => {
    repository.markRead.mockResolvedValue(undefined);
    const service = makeService();

    await service.markRead('ntf-1', 'org-1', 'user-1');

    expect(repository.markRead).toHaveBeenCalledWith('ntf-1', 'org-1', 'user-1');
  });

  it('markAllRead survives a pruning failure', async () => {
    repository.markAllRead.mockResolvedValue(undefined);
    repository.pruneOld.mockRejectedValue(new Error('lock timeout'));
    const service = makeService();

    await expect(service.markAllRead('org-1', 'user-1')).resolves.toBeUndefined();
    expect(repository.markAllRead).toHaveBeenCalledWith('org-1', 'user-1');
  });
});
