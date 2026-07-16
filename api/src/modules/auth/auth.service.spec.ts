// Author: Robert Massey | Created: 2026-07-12 | Module: Auth / Tests
// S0 test-debt paydown: signup guards (terms, duplicate email, trial-abuse
// domain heuristic), login lockout, and refresh reuse detection.

import { ForbiddenException, UnauthorizedException, ConflictException } from '@nestjs/common';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

import { AuthService } from './auth.service';
import type { SignupDto } from './dto/signup.dto';

const authRepository = {
  findOrganizationBySlug: jest.fn(),
  createSignup: jest.fn(),
  findTrialFingerprintByDomainHash: jest.fn(),
  findUserByEmail: jest.fn(),
  findUserById: jest.fn(),
  updateUser: jest.fn(),
  recordSuccessfulLogin: jest.fn(),
  incrementFailedAttempts: jest.fn(),
  lockAccount: jest.fn(),
  createRefreshToken: jest.fn(),
  findRefreshTokenByFamily: jest.fn(),
  atomicRevokeIfActive: jest.fn(),
  revokeTokenFamily: jest.fn(),
  revokeAllUserRefreshTokens: jest.fn(),
  deleteExpiredRefreshTokens: jest.fn(),
  createPasswordResetToken: jest.fn(),
  findPasswordResetToken: jest.fn(),
  consumePasswordResetToken: jest.fn(),
};

const jwtService = {
  sign: jest.fn(() => 'signed-token'),
  verify: jest.fn(),
};

const configService = {
  getOrThrow: jest.fn((key: string) => {
    const values: Record<string, string> = {
      JWT_ACCESS_TTL: '900',
      JWT_REFRESH_TTL: '604800',
      JWT_REFRESH_SECRET: 'x'.repeat(32),
    };
    return values[key];
  }),
  get: jest.fn((_key: string, defaultValue?: unknown) => defaultValue),
};

const logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };
const emailService = { send: jest.fn().mockResolvedValue(undefined) };
const opsEvents = { record: jest.fn(), security: jest.fn() };

function makeService(): AuthService {
  // Reason: structural mocks stand in for Nest providers in unit tests.
  return new AuthService(
    authRepository as any,
    jwtService as any,
    configService as any,
    logger as any,
    emailService as any,
    opsEvents as any,
  );
}

function signupDto(overrides: Partial<SignupDto> = {}): SignupDto {
  return {
    email: 'jane@acme-plumbing.com',
    password: 'correct-horse-battery-staple-42',
    firstName: 'Jane',
    lastName: 'Doe',
    organizationName: 'Acme Plumbing',
    acceptedTerms: true,
    ...overrides,
  } as SignupDto;
}

beforeEach(() => {
  jest.clearAllMocks();
  authRepository.findOrganizationBySlug.mockResolvedValue(null);
  authRepository.findTrialFingerprintByDomainHash.mockResolvedValue(false);
  authRepository.createRefreshToken.mockResolvedValue({});
  authRepository.recordSuccessfulLogin.mockResolvedValue(undefined);
  authRepository.deleteExpiredRefreshTokens.mockResolvedValue(undefined);
});

describe('AuthService.signup guards', () => {
  const service = makeService();

  it('rejects signup without accepted terms', async () => {
    await expect(service.signup(signupDto({ acceptedTerms: false }))).rejects.toThrow(
      'You must accept the Terms of Service',
    );
  });

  it('rejects a duplicate email', async () => {
    authRepository.findUserByEmail.mockResolvedValue({ id: 'u1' });
    await expect(service.signup(signupDto())).rejects.toThrow(ConflictException);
  });

  it('blocks a second trial for a custom email domain', async () => {
    authRepository.findUserByEmail.mockResolvedValue(null);
    authRepository.findTrialFingerprintByDomainHash.mockResolvedValue(true);
    await expect(service.signup(signupDto())).rejects.toThrow(
      'A free trial has already been used for this email domain',
    );
    expect(authRepository.createSignup).not.toHaveBeenCalled();
  });

  it('exempts free mailbox providers from the domain heuristic', async () => {
    authRepository.findUserByEmail.mockResolvedValue(null);
    authRepository.findTrialFingerprintByDomainHash.mockResolvedValue(true); // would block a custom domain
    authRepository.createSignup.mockResolvedValue({
      user: { id: 'u1', email: 'jane@gmail.com', role: Role.OWNER },
      organization: { id: 'org-1' },
    });

    const result = await service.signup(signupDto({ email: 'jane@gmail.com' }));

    expect(result.organizationId).toBe('org-1');
    expect(authRepository.findTrialFingerprintByDomainHash).not.toHaveBeenCalled();
  });

  it('creates org + OWNER + trial with a 14-day trialEndsAt', async () => {
    authRepository.findUserByEmail.mockResolvedValue(null);
    authRepository.createSignup.mockResolvedValue({
      user: { id: 'u1', email: 'jane@acme-plumbing.com', role: Role.OWNER },
      organization: { id: 'org-1' },
    });

    const before = Date.now();
    const result = await service.signup(signupDto());
    const trialEnd = new Date(result.trialEndsAt).getTime();

    const fourteenDays = 14 * 24 * 60 * 60 * 1000;
    expect(trialEnd - before).toBeGreaterThan(fourteenDays - 5000);
    expect(trialEnd - before).toBeLessThan(fourteenDays + 5000);
    expect(result.tokens.accessToken).toBe('signed-token');
  });
});

describe('AuthService.login lockout', () => {
  const service = makeService();

  const baseUser = {
    id: 'u1',
    email: 'jane@acme-plumbing.com',
    passwordHash: bcrypt.hashSync('right-password-123456', 4),
    role: Role.OWNER,
    organizationId: 'org-1',
    firstName: 'Jane',
    lastName: 'Doe',
    deletedAt: null,
    lockedUntil: null,
    failedAttempts: 0,
    mustChangePassword: false,
  };

  it('uniform invalid-credentials for unknown emails (no enumeration)', async () => {
    authRepository.findUserByEmail.mockResolvedValue(null);
    await expect(
      service.login({ email: 'nobody@x.com', password: 'whatever-12345' }),
    ).rejects.toThrow('Invalid credentials');
  });

  it('rejects login while the account is locked', async () => {
    authRepository.findUserByEmail.mockResolvedValue({
      ...baseUser,
      lockedUntil: new Date(Date.now() + 10 * 60 * 1000),
    });
    await expect(
      service.login({ email: baseUser.email, password: 'right-password-123456' }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('locks the account on the 5th consecutive failure', async () => {
    authRepository.findUserByEmail.mockResolvedValue(baseUser);
    authRepository.incrementFailedAttempts.mockResolvedValue({
      ...baseUser,
      failedAttempts: 5,
    });

    await expect(
      service.login({ email: baseUser.email, password: 'wrong-password-123456' }),
    ).rejects.toThrow(UnauthorizedException);

    expect(authRepository.lockAccount).toHaveBeenCalledWith('u1', expect.any(Date));
  });

  it('logs in and returns a token pair on correct credentials', async () => {
    authRepository.findUserByEmail.mockResolvedValue(baseUser);

    const result = await service.login({
      email: baseUser.email,
      password: 'right-password-123456',
    });

    expect(result.userId).toBe('u1');
    expect(result.tokens.accessToken).toBe('signed-token');
    expect(authRepository.recordSuccessfulLogin).toHaveBeenCalledWith('u1');
  });
});

describe('AuthService.refresh reuse detection', () => {
  const service = makeService();

  it('revokes the whole family when a revoked token is replayed', async () => {
    jwtService.verify.mockReturnValue({ sub: 'u1', family: 'fam-1', tokenType: 'refresh' });
    authRepository.findRefreshTokenByFamily.mockResolvedValue([
      { id: 'rt1', isRevoked: true, tokenHash: 'h', userId: 'u1' },
    ]);

    await expect(service.refresh('raw-token')).rejects.toThrow('Refresh token already used');
    expect(authRepository.revokeTokenFamily).toHaveBeenCalledWith('fam-1');
  });

  it('rejects tokens that are not refresh-typed', async () => {
    jwtService.verify.mockReturnValue({ sub: 'u1', family: 'fam-1', tokenType: 'access' });
    await expect(service.refresh('raw-token')).rejects.toThrow('Invalid token type');
  });
});
