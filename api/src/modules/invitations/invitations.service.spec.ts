// Author: Robert Massey | Created: 2026-07-13 | Module: Invitations / Tests
// Seat-cap enforcement (SB-019): invites are blocked at maxUsers on create
// AND re-checked at accept (seats can fill or plans downgrade in between).
// Plus the existing invariants: role ceiling, duplicate guards, token expiry.

import { createHash } from 'crypto';

import { BadRequestException, ConflictException, GoneException } from '@nestjs/common';
import { Role } from '@prisma/client';

import { InvitationsService } from './invitations.service';

import { EntitlementExceededException } from '@/modules/entitlements/entitlement-exceeded.exception';

const repository = {
  findActiveUserByEmail: jest.fn(),
  findActiveUserByEmailGlobal: jest.fn(),
  findPendingInvite: jest.fn(),
  createInvite: jest.fn(),
  findInviteById: jest.fn(),
  findInviteByTokenHash: jest.fn(),
  refreshInviteToken: jest.fn(),
  listPendingInvites: jest.fn(),
  deleteInvite: jest.fn(),
  acceptInviteTransaction: jest.fn(),
};

const emailService = { send: jest.fn().mockResolvedValue(undefined) };
const logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };
const config = { get: jest.fn((_k: string, d?: unknown) => d) };
const entitlements = { assertCountedAvailable: jest.fn() };

const INVITER = {
  userId: 'user-1',
  email: 'owner@acme.test',
  role: Role.OWNER,
  organizationId: 'org-1',
};

const RAW_TOKEN = 'a'.repeat(64);

function seatCapError(): EntitlementExceededException {
  return new EntitlementExceededException({
    entitlement: 'users',
    limit: 2,
    current: 2,
    resetsAt: null,
    upgradeUrl: '/billing',
  });
}

function inviteRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'inv-1',
    tokenHash: createHash('sha256').update(RAW_TOKEN).digest('hex'),
    email: 'new@acme.test',
    firstName: 'Nina',
    lastName: 'New',
    role: Role.BUILDER,
    orgId: 'org-1',
    invitedById: 'user-1',
    expiresAt: new Date(Date.now() + 86_400_000),
    acceptedAt: null,
    createdAt: new Date(),
    ...overrides,
  };
}

function makeService(): InvitationsService {
  // Reason: structural mocks stand in for Nest providers in unit tests.
  return new InvitationsService(
    repository as any,
    emailService as any,
    logger as any,
    config as any,
    entitlements as any,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  repository.findActiveUserByEmail.mockResolvedValue(null);
  repository.findActiveUserByEmailGlobal.mockResolvedValue(null);
  repository.findPendingInvite.mockResolvedValue(null);
  repository.createInvite.mockResolvedValue(inviteRecord());
  entitlements.assertCountedAvailable.mockResolvedValue(undefined);
});

describe('createPlatformAdminInvite (SB-030)', () => {
  const PLATFORM_ADMIN = {
    userId: 'padmin-1',
    email: 'admin@attuneitus.com',
    role: Role.PLATFORM_ADMIN,
    organizationId: 'platform-org',
  };

  it('creates a PLATFORM_ADMIN invite for a platform admin caller', async () => {
    repository.createInvite.mockResolvedValue(
      inviteRecord({ role: Role.PLATFORM_ADMIN, orgId: 'platform-org' }),
    );
    const service = makeService();

    await service.createPlatformAdminInvite(
      PLATFORM_ADMIN as any,
      'ops@attuneitus.com',
      'Ops',
      'Peer',
    );

    expect(repository.createInvite).toHaveBeenCalledWith(
      expect.objectContaining({
        role: Role.PLATFORM_ADMIN,
        orgId: 'platform-org',
        email: 'ops@attuneitus.com',
      }),
    );
    expect(emailService.send).toHaveBeenCalledWith(
      expect.objectContaining({ subject: expect.stringContaining('platform staff') }),
    );
  });

  it('rejects non-platform-admin callers', async () => {
    const service = makeService();
    await expect(
      service.createPlatformAdminInvite(INVITER as any, 'x@y.com', 'X', 'Y'),
    ).rejects.toThrow('Only platform admins');
  });
});

describe('createInvite seat cap (SB-019)', () => {
  it('checks seat headroom before creating the invite', async () => {
    const service = makeService();

    await service.createInvite(INVITER as any, 'new@acme.test', 'Nina', 'New', Role.BUILDER);

    expect(entitlements.assertCountedAvailable).toHaveBeenCalledWith('org-1', 'users');
    expect(repository.createInvite).toHaveBeenCalled();
    expect(emailService.send).toHaveBeenCalled();
  });

  it('blocks the invite with LIMIT_EXCEEDED at the seat ceiling', async () => {
    entitlements.assertCountedAvailable.mockRejectedValue(seatCapError());
    const service = makeService();

    await expect(
      service.createInvite(INVITER as any, 'new@acme.test', 'Nina', 'New', Role.BUILDER),
    ).rejects.toThrow(EntitlementExceededException);
    expect(repository.createInvite).not.toHaveBeenCalled();
    expect(emailService.send).not.toHaveBeenCalled();
  });

  it('still rejects OWNER/PLATFORM_ADMIN invites before touching the cap', async () => {
    const service = makeService();

    await expect(
      service.createInvite(INVITER as any, 'new@acme.test', 'Nina', 'New', Role.OWNER),
    ).rejects.toThrow(BadRequestException);
    expect(entitlements.assertCountedAvailable).not.toHaveBeenCalled();
  });

  it('still rejects duplicate members and pending invites', async () => {
    repository.findActiveUserByEmail.mockResolvedValue({ id: 'user-2' });
    const service = makeService();

    await expect(
      service.createInvite(INVITER as any, 'new@acme.test', 'Nina', 'New', Role.BUILDER),
    ).rejects.toThrow(ConflictException);
  });
});

describe('acceptInvite seat cap (SB-019)', () => {
  it('re-checks the cap at accept and creates the account under it', async () => {
    repository.findInviteByTokenHash.mockResolvedValue(inviteRecord());
    repository.acceptInviteTransaction.mockResolvedValue({ id: 'user-9', email: 'new@acme.test' });
    const service = makeService();

    const result = await service.acceptInvite(RAW_TOKEN, 'Str0ng!Passw0rd#2026');

    expect(entitlements.assertCountedAvailable).toHaveBeenCalledWith('org-1', 'users');
    expect(result).toEqual({ userId: 'user-9', email: 'new@acme.test' });
  });

  it('blocks accept when seats filled after the invite went out; invite stays pending', async () => {
    repository.findInviteByTokenHash.mockResolvedValue(inviteRecord());
    entitlements.assertCountedAvailable.mockRejectedValue(seatCapError());
    const service = makeService();

    await expect(service.acceptInvite(RAW_TOKEN, 'Str0ng!Passw0rd#2026')).rejects.toThrow(
      EntitlementExceededException,
    );
    expect(repository.acceptInviteTransaction).not.toHaveBeenCalled();
  });

  it('still rejects expired tokens', async () => {
    repository.findInviteByTokenHash.mockResolvedValue(
      inviteRecord({ expiresAt: new Date(Date.now() - 1000) }),
    );
    const service = makeService();

    await expect(service.acceptInvite(RAW_TOKEN, 'Str0ng!Passw0rd#2026')).rejects.toThrow(
      GoneException,
    );
  });
});
