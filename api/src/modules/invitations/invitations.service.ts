// Author: Robert Massey | Created: 2026-07-12 | Module: Invitations
// Purpose: Team member invitation lifecycle — create, validate, accept, resend, revoke.
// Ported from enterprise; emails send via EmailService directly (BullMQ queueing
// arrives with the workflow engine in P4). Seat counts are enforced against the
// org's plan in S1 when EntitlementsService lands — noted in SPRINT_01.
//
// Security model:
//  - Raw token is a 32-byte cryptographic random value (hex) — only sent in email
//  - Only a SHA-256 hash of the raw token is stored in the DB
//  - Tokens expire after 7 days
//  - Accepting a token creates the user account and marks the token as used

import { createHash, randomBytes } from 'crypto';

import {
  Injectable,
  ConflictException,
  NotFoundException,
  GoneException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

import { InvitationsRepository, InviteRecord } from './invitations.repository';

import type { AuthenticatedUser } from '@/modules/auth/strategies/jwt.strategy';
import { checkPasswordPolicy } from '@/modules/auth/utils/password-policy';
import { SecureLoggerService } from '@/modules/common/logger/secure-logger.service';
import { EntitlementsService } from '@/modules/entitlements/entitlements.service';
import {
  brandEmailShell,
  brandEmailButton,
  escapeHtml,
} from '@/modules/notifications/email-brand-shell';
import { EmailService } from '@/modules/notifications/email.service';

const INVITE_TTL_DAYS = 7;

export interface InviteDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  orgId: string;
  invitedById: string;
  expiresAt: Date;
  acceptedAt: Date | null;
  createdAt: Date;
}

@Injectable()
export class InvitationsService {
  private readonly bcryptRounds: number;

  constructor(
    private readonly repository: InvitationsRepository,
    private readonly emailService: EmailService,
    private readonly logger: SecureLoggerService,
    private readonly config: ConfigService,
    private readonly entitlements: EntitlementsService,
  ) {
    this.bcryptRounds = parseInt(this.config.get<string>('BCRYPT_ROUNDS', '12'), 10);
  }

  // --- Create ---

  async createInvite(
    invitedBy: AuthenticatedUser,
    email: string,
    firstName: string,
    lastName: string,
    role: Role,
  ): Promise<{ id: string; email: string }> {
    const targetOrgId = invitedBy.organizationId;

    // Invites can only grant tenant roles at or below the inviter's own level.
    if (role === Role.PLATFORM_ADMIN || role === Role.OWNER) {
      throw new BadRequestException('Cannot invite a user with this role');
    }

    return await this.createInviteInternal({
      invitedBy,
      email,
      firstName,
      lastName,
      role,
      orgId: targetOrgId,
      emailKind: 'team',
    });
  }

  /**
   * PLATFORM_ADMIN-only path (SB-030): invite a peer into the platform org
   * with the PLATFORM_ADMIN role. Regular /invitations rejects that role.
   */
  async createPlatformAdminInvite(
    invitedBy: AuthenticatedUser,
    email: string,
    firstName: string,
    lastName: string,
  ): Promise<{ id: string; email: string }> {
    if (invitedBy.role !== Role.PLATFORM_ADMIN) {
      throw new ForbiddenException('Only platform admins can invite platform staff');
    }

    return await this.createInviteInternal({
      invitedBy,
      email,
      firstName,
      lastName,
      role: Role.PLATFORM_ADMIN,
      orgId: invitedBy.organizationId,
      emailKind: 'platform',
    });
  }

  private async createInviteInternal(params: {
    invitedBy: AuthenticatedUser;
    email: string;
    firstName: string;
    lastName: string;
    role: Role;
    orgId: string;
    emailKind: 'team' | 'platform';
  }): Promise<{ id: string; email: string }> {
    const { invitedBy, email, firstName, lastName, role, orgId, emailKind } = params;

    const existing = await this.repository.findActiveUserByEmail(email, orgId);
    if (existing) {
      throw new ConflictException('A user with this email already exists in the organization.');
    }

    // Email is globally unique — refuse invites that would collide on accept.
    const globalHit = await this.repository.findActiveUserByEmailGlobal(email);
    if (globalHit) {
      throw new ConflictException(
        'A user with this email already exists on the platform. Use a different email.',
      );
    }

    const pending = await this.repository.findPendingInvite(email, orgId);
    if (pending) {
      throw new ConflictException(
        'A pending invitation for this email already exists. Use resend to refresh it.',
      );
    }

    // Seat cap (SB-019): don't send an invite the org has no seat for.
    // Platform org overrides set maxUsers to effectively unlimited.
    await this.entitlements.assertCountedAvailable(orgId, 'users');

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);

    const invite = await this.repository.createInvite({
      tokenHash,
      email,
      firstName,
      lastName,
      role,
      orgId,
      invitedById: invitedBy.userId,
      expiresAt,
    });

    if (emailKind === 'platform') {
      await this.sendPlatformInviteEmail(email, firstName, rawToken, expiresAt);
    } else {
      await this.sendInviteEmail(email, firstName, rawToken, expiresAt);
    }
    this.logger.log(`invite.created org=${orgId} role=${role}`, 'InvitationsService');

    return { id: invite.id, email };
  }

  // --- Validate (public) ---

  async validateInviteToken(rawToken: string): Promise<InviteDto> {
    const record = await this.findActiveToken(rawToken);
    return this.toDto(record);
  }

  // --- Accept (public) — create the user account ---

  async acceptInvite(
    rawToken: string,
    password: string,
  ): Promise<{ userId: string; email: string }> {
    const record = await this.findActiveToken(rawToken);

    // Re-check the seat cap at accept time — seats can fill (or the plan can
    // downgrade) between invite and accept. The invite stays pending so it
    // works again once a seat frees up or the org upgrades.
    await this.entitlements.assertCountedAvailable(record.orgId, 'users');

    const policyResult = checkPasswordPolicy(password, {
      firstName: record.firstName,
      lastName: record.lastName,
    });
    if (!policyResult.valid) {
      throw new BadRequestException(policyResult.errors.join(' '));
    }

    const passwordHash = await bcrypt.hash(password, this.bcryptRounds);
    const user = await this.repository.acceptInviteTransaction(record, passwordHash);

    this.logger.log(`invite.accepted userId=${user.id}`, 'InvitationsService');
    return { userId: user.id, email: user.email };
  }

  // --- Resend ---

  async resendInvite(
    inviteId: string,
    caller: AuthenticatedUser,
  ): Promise<{ id: string; email: string }> {
    const invite = await this.repository.findInviteById(inviteId);
    if (!invite) {
      throw new NotFoundException('Invite not found');
    }

    if (caller.role !== Role.PLATFORM_ADMIN && invite.orgId !== caller.organizationId) {
      throw new ForbiddenException('Cannot resend invite for another organization');
    }
    if (invite.acceptedAt) {
      throw new BadRequestException('Invite already accepted');
    }

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);

    await this.repository.refreshInviteToken(inviteId, tokenHash, expiresAt);
    await this.sendInviteEmail(invite.email, invite.firstName, rawToken, expiresAt);
    this.logger.log(`invite.resent id=${inviteId}`, 'InvitationsService');

    return { id: inviteId, email: invite.email };
  }

  // --- List pending ---

  async listPending(caller: AuthenticatedUser): Promise<InviteDto[]> {
    const records = await this.repository.listPendingInvites(caller.organizationId);
    return records.map((r) => this.toDto(r));
  }

  // --- Revoke ---

  async revokeInvite(inviteId: string, caller: AuthenticatedUser): Promise<void> {
    const invite = await this.repository.findInviteById(inviteId);
    if (!invite) {
      throw new NotFoundException('Invite not found');
    }
    if (caller.role !== Role.PLATFORM_ADMIN && invite.orgId !== caller.organizationId) {
      throw new ForbiddenException('Cannot revoke invite for another organization');
    }
    await this.repository.deleteInvite(inviteId);
    this.logger.log(`invite.revoked id=${inviteId}`, 'InvitationsService');
  }

  // --- Private helpers ---

  private async findActiveToken(rawToken: string): Promise<InviteRecord> {
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const record = await this.repository.findInviteByTokenHash(tokenHash);
    if (!record) {
      throw new NotFoundException('Invitation not found or already used');
    }
    if (record.acceptedAt) {
      throw new GoneException('This invitation has already been accepted');
    }
    if (record.expiresAt < new Date()) {
      throw new GoneException('This invitation has expired');
    }
    return record;
  }

  private toDto(r: InviteRecord): InviteDto {
    return {
      id: r.id,
      email: r.email,
      firstName: r.firstName,
      lastName: r.lastName,
      role: r.role,
      orgId: r.orgId,
      invitedById: r.invitedById,
      expiresAt: r.expiresAt,
      acceptedAt: r.acceptedAt,
      createdAt: r.createdAt,
    };
  }

  private async sendInviteEmail(
    email: string,
    firstName: string,
    rawToken: string,
    expiresAt: Date,
  ): Promise<void> {
    const appUrl = this.config.get<string>('APP_URL', 'http://localhost:3100');
    const acceptUrl = `${appUrl}/accept-invite?token=${rawToken}`;
    const expiry = expiresAt.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });

    const html = brandEmailShell({
      title: "You've been invited to Attune Smart Forms",
      bodyHtml: `
        <p style="margin:0 0 16px;font-size:15px;color:#334155;">Hi <strong>${escapeHtml(firstName)}</strong>,</p>
        <p style="margin:0 0 24px;font-size:15px;color:#334155;line-height:1.6;">
          You've been invited to join your team on <strong>Attune Smart Forms</strong>.
          Click the button below to set your password and activate your account.</p>
        ${brandEmailButton(acceptUrl, 'Accept Invitation')}
        <p style="margin:24px 0 0;font-size:12px;color:#64748B;">This invitation expires on <strong>${expiry}</strong>. If you didn't expect this email, you can safely ignore it.</p>
        <p style="margin:12px 0 0;font-size:12px;color:#94A3B8;">Or copy this link:<br/><a href="${acceptUrl}" style="color:#EA580C;word-break:break-all;">${acceptUrl}</a></p>`,
    });

    const text = `Hi ${firstName},\n\nYou've been invited to Attune Smart Forms.\n\nAccept your invitation: ${acceptUrl}\n\nThis link expires on ${expiry}.`;

    await this.emailService.send({
      to: email,
      subject: "You've been invited to Attune Smart Forms",
      html,
      text,
    });
  }

  private async sendPlatformInviteEmail(
    email: string,
    firstName: string,
    rawToken: string,
    expiresAt: Date,
  ): Promise<void> {
    const appUrl = this.config.get<string>('APP_URL', 'http://localhost:3100');
    const acceptUrl = `${appUrl}/accept-invite?token=${rawToken}`;
    const expiry = expiresAt.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });

    const html = brandEmailShell({
      title: "You've been invited as Attune platform staff",
      bodyHtml: `
        <p style="margin:0 0 16px;font-size:15px;color:#334155;">Hi <strong>${escapeHtml(firstName)}</strong>,</p>
        <p style="margin:0 0 24px;font-size:15px;color:#334155;line-height:1.6;">
          You've been invited as a <strong>Platform Admin</strong> on Attune Smart Forms —
          with access to the admin console, ops tools, and customer support actions.
          Click below to set your password and activate your account.</p>
        ${brandEmailButton(acceptUrl, 'Accept Platform Invite')}
        <p style="margin:24px 0 0;font-size:12px;color:#64748B;">This invitation expires on <strong>${expiry}</strong>. If you didn't expect this email, contact the person who invited you.</p>
        <p style="margin:12px 0 0;font-size:12px;color:#94A3B8;">Or copy this link:<br/><a href="${acceptUrl}" style="color:#EA580C;word-break:break-all;">${acceptUrl}</a></p>`,
    });

    const text = `Hi ${firstName},\n\nYou've been invited as a Platform Admin on Attune Smart Forms.\n\nAccept: ${acceptUrl}\n\nExpires ${expiry}.`;

    await this.emailService.send({
      to: email,
      subject: "You've been invited as Attune platform staff",
      html,
      text,
    });
  }
}
