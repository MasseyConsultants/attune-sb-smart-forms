// Author: Robert Massey | Created: 2026-07-12 | Module: Auth
// Purpose: All database operations for the auth domain.
// Services call this — never touch PrismaService directly from a service.

import { Injectable } from '@nestjs/common';
import {
  Prisma,
  User,
  Organization,
  RefreshToken,
  PasswordResetToken,
  Subscription,
  Role,
  SubscriptionStatus,
} from '@prisma/client';

import { PrismaService } from '../common/prisma/prisma.service';

export interface SignupCreateParams {
  readonly email: string;
  readonly passwordHash: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly organizationName: string;
  readonly organizationSlug: string;
  readonly trialEndsAt: Date;
  readonly billingAnchorDay: number;
  readonly trialSeats: number;
  readonly emailDomainHash: string;
}

export interface SignupCreateResult {
  readonly user: User;
  readonly organization: Organization;
  readonly subscription: Subscription;
}

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  // --- Organization ---

  findOrganizationBySlug(slug: string): Promise<Organization | null> {
    return this.prisma.organization.findUnique({ where: { slug } });
  }

  // Signup is atomic: org + OWNER user + TRIALING subscription + abuse fingerprint
  // are created together or not at all.
  createSignup(params: SignupCreateParams): Promise<SignupCreateResult> {
    return this.prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name: params.organizationName,
          slug: params.organizationSlug,
        },
      });

      const user = await tx.user.create({
        data: {
          email: params.email,
          passwordHash: params.passwordHash,
          firstName: params.firstName,
          lastName: params.lastName,
          role: Role.OWNER,
          organizationId: organization.id,
          acceptedTermsAt: new Date(),
        },
      });

      const subscription = await tx.subscription.create({
        data: {
          organizationId: organization.id,
          planId: 'trial',
          status: SubscriptionStatus.TRIALING,
          trialEndsAt: params.trialEndsAt,
          billingAnchorDay: params.billingAnchorDay,
          seats: params.trialSeats,
        },
      });

      await tx.trialFingerprint.create({
        data: {
          emailDomainHash: params.emailDomainHash,
          organizationId: organization.id,
        },
      });

      return { user, organization, subscription };
    });
  }

  async findTrialFingerprintByDomainHash(emailDomainHash: string): Promise<boolean> {
    const existing = await this.prisma.trialFingerprint.findFirst({
      where: { emailDomainHash },
      select: { id: true },
    });
    return existing !== null;
  }

  // --- User ---

  findUserByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findUserById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  updateUser(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return this.prisma.user.update({ where: { id }, data });
  }

  /** Record a completed sign-in. Not used for token refresh. */
  async recordSuccessfulLogin(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { firstLoginAt: true },
    });
    if (!user) {
      return;
    }

    const now = new Date();
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        lastLoginAt: now,
        firstLoginAt: user.firstLoginAt ?? now,
        loginCount: { increment: 1 },
        failedAttempts: 0,
        lockedUntil: null,
      },
    });
  }

  // --- Account lockout ---

  incrementFailedAttempts(userId: string): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { failedAttempts: { increment: 1 } },
    });
  }

  async lockAccount(userId: string, lockedUntil: Date): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { lockedUntil, failedAttempts: 5 },
    });
  }

  // --- Refresh tokens ---

  createRefreshToken(data: Prisma.RefreshTokenCreateInput): Promise<RefreshToken> {
    return this.prisma.refreshToken.create({ data });
  }

  findRefreshTokenByFamily(family: string): Promise<RefreshToken[]> {
    return this.prisma.refreshToken.findMany({ where: { family } });
  }

  /**
   * Atomically revokes a refresh token only if it is still active.
   * Returns true if this caller "won"; false if a concurrent request already
   * revoked it. Closes the TOCTOU race in the rotation path.
   */
  async atomicRevokeIfActive(id: string): Promise<boolean> {
    const result = await this.prisma.refreshToken.updateMany({
      where: { id, isRevoked: false },
      data: { isRevoked: true },
    });
    return result.count === 1;
  }

  // Revoke all tokens in a family — used when a reused (already-revoked) token
  // is presented, which signals possible token theft.
  async revokeTokenFamily(family: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { family },
      data: { isRevoked: true },
    });
  }

  async revokeAllUserRefreshTokens(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId },
      data: { isRevoked: true },
    });
  }

  async deleteExpiredRefreshTokens(userId: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({
      where: { userId, expiresAt: { lt: new Date() } },
    });
  }

  // --- Password reset tokens (one-time-use nonces) ---

  async createPasswordResetToken(data: {
    userId: string;
    jtiHash: string;
    expiresAt: Date;
  }): Promise<void> {
    await this.prisma.passwordResetToken.create({ data });
  }

  findPasswordResetToken(jtiHash: string): Promise<PasswordResetToken | null> {
    return this.prisma.passwordResetToken.findUnique({ where: { jtiHash } });
  }

  async consumePasswordResetToken(id: string): Promise<void> {
    await this.prisma.passwordResetToken.update({
      where: { id },
      data: { usedAt: new Date() },
    });
  }
}
