// Author: Robert Massey | Created: 2026-07-12 | Module: Invitations
// Purpose: All database operations for the invitations domain.

import { Injectable } from '@nestjs/common';
import { InviteToken, Role, User } from '@prisma/client';

import { PrismaService } from '@/modules/common/prisma/prisma.service';

export type InviteRecord = InviteToken;

export interface CreateInviteParams {
  readonly tokenHash: string;
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly role: Role;
  readonly orgId: string;
  readonly invitedById: string;
  readonly expiresAt: Date;
}

@Injectable()
export class InvitationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findActiveUserByEmail(email: string, orgId: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: {
        email: { equals: email, mode: 'insensitive' },
        organizationId: orgId,
        deletedAt: null,
      },
    });
  }

  findPendingInvite(email: string, orgId: string): Promise<InviteToken | null> {
    return this.prisma.inviteToken.findFirst({
      where: {
        email: { equals: email, mode: 'insensitive' },
        orgId,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
  }

  createInvite(params: CreateInviteParams): Promise<InviteToken> {
    return this.prisma.inviteToken.create({ data: params });
  }

  findInviteById(id: string): Promise<InviteToken | null> {
    return this.prisma.inviteToken.findUnique({ where: { id } });
  }

  findInviteByTokenHash(tokenHash: string): Promise<InviteToken | null> {
    return this.prisma.inviteToken.findUnique({ where: { tokenHash } });
  }

  async refreshInviteToken(id: string, tokenHash: string, expiresAt: Date): Promise<void> {
    await this.prisma.inviteToken.update({
      where: { id },
      data: { tokenHash, expiresAt },
    });
  }

  listPendingInvites(orgId: string): Promise<InviteToken[]> {
    return this.prisma.inviteToken.findMany({
      where: { orgId, acceptedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteInvite(id: string): Promise<void> {
    await this.prisma.inviteToken.delete({ where: { id } });
  }

  // Creates (or restores a soft-deleted) user and consumes the invite atomically.
  // email is globally @unique, so a soft-deleted record must be UPDATEd rather than
  // INSERTed — otherwise the invite link becomes permanently unusable.
  acceptInviteTransaction(record: InviteToken, passwordHash: string): Promise<User> {
    return this.prisma.$transaction(async (tx) => {
      const softDeleted = await tx.user.findFirst({
        where: {
          email: { equals: record.email, mode: 'insensitive' },
          organizationId: record.orgId,
          deletedAt: { not: null },
        },
      });

      const user = softDeleted
        ? await tx.user.update({
            where: { id: softDeleted.id },
            data: {
              passwordHash,
              firstName: record.firstName,
              lastName: record.lastName,
              role: record.role,
              emailVerified: true,
              isActive: true,
              mustChangePassword: false,
              deletedAt: null,
            },
          })
        : await tx.user.create({
            data: {
              email: record.email,
              passwordHash,
              firstName: record.firstName,
              lastName: record.lastName,
              role: record.role,
              organizationId: record.orgId,
              emailVerified: true, // invitation counts as email verification
              isActive: true,
              mustChangePassword: false,
              acceptedTermsAt: new Date(),
            },
          });

      await tx.inviteToken.update({
        where: { id: record.id },
        data: { acceptedAt: new Date() },
      });

      return user;
    });
  }
}
