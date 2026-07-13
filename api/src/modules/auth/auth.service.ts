// Author: Robert Massey | Created: 2026-07-12 | Module: Auth
// Purpose: All auth business logic — self-serve signup (org + OWNER + TRIALING
// subscription), login, refresh rotation, lockout, forgot/reset password, email
// verification. Ported from enterprise; MFA and username-only accounts are cut
// (BACKLOG SB-002). Services throw domain exceptions; the global filter formats them.

import { createHash, randomUUID } from 'crypto';

import { TRIAL_LENGTH_DAYS, PLAN_ENTITLEMENTS } from '@attune-sb/shared-types';
import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

import { SecureLoggerService } from '../common/logger/secure-logger.service';
import { brandEmailShell, brandEmailButton, escapeHtml } from '../notifications/email-brand-shell';
import { EmailService } from '../notifications/email.service';

import { AuthRepository } from './auth.repository';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import type { JwtPayload } from './strategies/jwt.strategy';
import { checkPasswordPolicy } from './utils/password-policy';

// --- Constants ---
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

// Free mailbox providers are exempt from the one-trial-per-email-domain rule —
// blocking every gmail.com signup after the first would kill acquisition.
// Custom (business) domains get one trial; repeats require a sales exception.
const FREE_EMAIL_DOMAINS = new Set([
  'gmail.com',
  'googlemail.com',
  'outlook.com',
  'hotmail.com',
  'live.com',
  'msn.com',
  'yahoo.com',
  'ymail.com',
  'aol.com',
  'icloud.com',
  'me.com',
  'proton.me',
  'protonmail.com',
  'gmx.com',
  'zoho.com',
  'mail.com',
]);

// --- Response shapes (never expose password hashes to callers) ---
export interface AuthTokenPair {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly expiresIn: number;
}

export interface SignupResult {
  readonly userId: string;
  readonly email: string;
  readonly organizationId: string;
  readonly trialEndsAt: string;
  readonly tokens: AuthTokenPair;
}

export interface LoginResult {
  readonly userId: string;
  readonly email: string;
  readonly role: Role;
  readonly organizationId: string;
  readonly mustChangePassword: boolean;
  readonly tokens: AuthTokenPair;
  readonly firstName: string;
  readonly lastName: string;
}

@Injectable()
export class AuthService {
  private readonly accessTtl: number;
  private readonly refreshTtl: number;
  private readonly bcryptRounds: number;
  private readonly refreshSecret: string;

  constructor(
    private readonly authRepository: AuthRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly logger: SecureLoggerService,
    private readonly emailService: EmailService,
  ) {
    // ConfigService returns env vars as strings — parseInt so JwtService doesn't
    // interpret string "900" as 900 milliseconds via the ms() lib.
    this.accessTtl = parseInt(this.configService.getOrThrow<string>('JWT_ACCESS_TTL'), 10);
    this.refreshTtl = parseInt(this.configService.getOrThrow<string>('JWT_REFRESH_TTL'), 10);
    this.bcryptRounds = parseInt(this.configService.get<string>('BCRYPT_ROUNDS', '12'), 10);
    this.refreshSecret = this.configService.getOrThrow<string>('JWT_REFRESH_SECRET');
  }

  // --- Signup (self-serve: org + OWNER + TRIALING subscription) ---

  async signup(dto: SignupDto): Promise<SignupResult> {
    if (!dto.acceptedTerms) {
      throw new BadRequestException('You must accept the Terms of Service and Privacy Policy');
    }

    const policyResult = checkPasswordPolicy(dto.password, {
      firstName: dto.firstName,
      lastName: dto.lastName,
    });
    if (!policyResult.valid) {
      throw new BadRequestException(policyResult.errors.join(' '));
    }

    const email = dto.email.toLowerCase().trim();
    const existing = await this.authRepository.findUserByEmail(email);
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const slug = await this.availableSlug(dto.organizationName);

    // Trial-abuse guard: one trial per custom email domain (free providers exempt).
    const domain = email.split('@')[1];
    const emailDomainHash = this.sha256(domain);
    if (!FREE_EMAIL_DOMAINS.has(domain)) {
      const alreadyTrialed =
        await this.authRepository.findTrialFingerprintByDomainHash(emailDomainHash);
      if (alreadyTrialed) {
        throw new ConflictException(
          'A free trial has already been used for this email domain. Contact support@attuneitus.com if you believe this is an error.',
        );
      }
    }

    const passwordHash = await bcrypt.hash(dto.password, this.bcryptRounds);
    const now = new Date();
    const trialEndsAt = new Date(now.getTime() + TRIAL_LENGTH_DAYS * 24 * 60 * 60 * 1000);

    const { user, organization } = await this.authRepository.createSignup({
      email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      organizationName: dto.organizationName.trim(),
      organizationSlug: slug,
      trialEndsAt,
      // Usage counters reset on the signup day-of-month until Stripe sets a real anchor.
      billingAnchorDay: now.getUTCDate(),
      trialSeats: PLAN_ENTITLEMENTS.trial.limits.usersIncluded,
      emailDomainHash,
    });

    this.logger.log(`User signed up: ${user.id} org=${organization.id}`, 'AuthService');

    // Fire-and-forget so a transient SMTP failure doesn't block the signup response.
    void this.resendVerification(user.id, user.email).catch(() => undefined);

    await this.authRepository.recordSuccessfulLogin(user.id);
    const tokens = await this.issueTokenPair(user.id, user.email, user.role, organization.id);

    return {
      userId: user.id,
      email: user.email,
      organizationId: organization.id,
      trialEndsAt: trialEndsAt.toISOString(),
      tokens,
    };
  }

  // --- Login ---

  async login(dto: LoginDto): Promise<LoginResult> {
    const user = await this.authRepository.findUserByEmail(dto.email.toLowerCase().trim());

    // Uniform 'invalid credentials' message prevents user enumeration.
    if (!user || user.deletedAt || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remainingMs = user.lockedUntil.getTime() - Date.now();
      const remainingMins = Math.ceil(remainingMs / 60000);
      throw new ForbiddenException(
        `Account locked. Try again in ${remainingMins} minute${remainingMins !== 1 ? 's' : ''}`,
      );
    }

    const passwordMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatch) {
      await this.handleFailedAttempt(user.id);
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.authRepository.recordSuccessfulLogin(user.id);
    const tokens = await this.issueTokenPair(user.id, user.email, user.role, user.organizationId);
    this.logger.log(`User logged in: ${user.id}`, 'AuthService');

    return {
      userId: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
      mustChangePassword: user.mustChangePassword ?? false,
      tokens,
      firstName: user.firstName,
      lastName: user.lastName,
    };
  }

  // --- Refresh (rotation with family tracking + reuse detection) ---

  async refresh(rawRefreshToken: string): Promise<AuthTokenPair> {
    let payload: { sub: string; family: string; tokenType: string };

    try {
      payload = this.jwtService.verify<{ sub: string; family: string; tokenType: string }>(
        rawRefreshToken,
        { secret: this.refreshSecret },
      );
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (payload.tokenType !== 'refresh') {
      throw new UnauthorizedException('Invalid token type');
    }

    const familyTokens = await this.authRepository.findRefreshTokenByFamily(payload.family);
    const stored = familyTokens.find((t) => !t.isRevoked);

    if (!stored) {
      // All tokens in this family are revoked — probable token reuse/theft.
      await this.authRepository.revokeTokenFamily(payload.family);
      this.logger.warn(`Refresh token reuse detected for family: ${payload.family}`, 'AuthService');
      throw new UnauthorizedException('Refresh token already used — please log in again');
    }

    const tokenMatch = await bcrypt.compare(this.sha256(rawRefreshToken), stored.tokenHash);
    if (!tokenMatch) {
      await this.authRepository.revokeTokenFamily(payload.family);
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.authRepository.findUserById(stored.userId);
    if (!user || user.deletedAt || !user.isActive) {
      throw new UnauthorizedException('Account not found or deactivated');
    }

    // Rotate: atomically revoke the old token (CAS). Two concurrent refresh calls
    // both pass the hash check, but only one wins this updateMany; the loser is
    // rejected, preventing two valid refresh tokens from a single one.
    const revoked = await this.authRepository.atomicRevokeIfActive(stored.id);
    if (!revoked) {
      await this.authRepository.revokeTokenFamily(payload.family);
      this.logger.warn(
        `Concurrent refresh detected for family: ${payload.family} — family revoked`,
        'AuthService',
      );
      throw new UnauthorizedException('Refresh token already used — please log in again');
    }

    return this.issueTokenPair(user.id, user.email, user.role, user.organizationId, payload.family);
  }

  // --- Logout ---

  async logout(userId: string): Promise<void> {
    await this.authRepository.revokeAllUserRefreshTokens(userId);
    this.logger.log(`User logged out: ${userId}`, 'AuthService');
  }

  // --- Forgot password ---

  async forgotPassword(email: string): Promise<void> {
    const user = await this.authRepository.findUserByEmail(email.toLowerCase().trim());

    // Always return success — prevents email enumeration (OWASP A07)
    if (!user || user.deletedAt) {
      return;
    }

    const jti = randomUUID();
    const resetToken = this.jwtService.sign(
      { sub: user.id, tokenType: 'password-reset', jti },
      { expiresIn: 900 }, // 15 minutes
    );

    // Persist the JTI hash so the token can be consumed exactly once.
    await this.authRepository.createPasswordResetToken({
      userId: user.id,
      jtiHash: this.sha256(jti),
      expiresAt: new Date(Date.now() + 900_000),
    });

    const appUrl = this.configService.get<string>('APP_URL', 'http://localhost:3100');
    const resetLink = `${appUrl}/reset-password?token=${resetToken}`;

    await this.emailService.send({
      to: user.email,
      subject: 'Reset your Attune Smart Forms password',
      html: brandEmailShell({
        title: 'Reset your password',
        bodyHtml: `
          <p style="margin:0 0 16px;font-size:15px;color:#334155;">Hi <strong>${escapeHtml(user.firstName)}</strong>,</p>
          <p style="margin:0 0 24px;font-size:15px;color:#334155;line-height:1.6;">
            We received a request to reset your password. Click the button below to choose a new one.
            This link expires in <strong>15 minutes</strong>.</p>
          ${brandEmailButton(resetLink, 'Reset Password')}
          <p style="margin:24px 0 0;font-size:12px;color:#64748B;">If you didn't request a password reset, you can safely ignore this email.</p>`,
      }),
    });

    this.logger.log(`Password reset email sent for user ${user.id}`, 'AuthService');
  }

  // --- Reset password ---

  async resetPassword(token: string, newPassword: string): Promise<void> {
    let payload: { sub: string; tokenType: string; jti?: string };

    try {
      payload = this.jwtService.verify<{ sub: string; tokenType: string; jti?: string }>(token, {
        secret: this.configService.getOrThrow<string>('JWT_SECRET'),
      });
    } catch {
      throw new BadRequestException('Invalid or expired reset token');
    }

    if (payload.tokenType !== 'password-reset' || !payload.jti) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // One-time-use: consume the JTI nonce atomically before any other write.
    const nonce = await this.authRepository.findPasswordResetToken(this.sha256(payload.jti));
    if (!nonce || nonce.usedAt || nonce.expiresAt < new Date()) {
      throw new BadRequestException(
        'This password reset link has already been used or has expired',
      );
    }
    await this.authRepository.consumePasswordResetToken(nonce.id);

    const user = await this.authRepository.findUserById(payload.sub);
    if (!user || user.deletedAt) {
      throw new NotFoundException('User not found');
    }

    const policyResult = checkPasswordPolicy(newPassword, {
      firstName: user.firstName,
      lastName: user.lastName,
    });
    if (!policyResult.valid) {
      throw new BadRequestException(policyResult.errors.join(' '));
    }

    const passwordHash = await bcrypt.hash(newPassword, this.bcryptRounds);
    await this.authRepository.updateUser(user.id, { passwordHash });
    await this.authRepository.revokeAllUserRefreshTokens(user.id);

    this.logger.log(`Password reset completed for user: ${user.id}`, 'AuthService');
  }

  // --- Email verification ---

  async verifyEmail(token: string): Promise<void> {
    let payload: { sub: string; tokenType: string };

    try {
      payload = this.jwtService.verify<{ sub: string; tokenType: string }>(token, {
        secret: this.configService.getOrThrow<string>('JWT_SECRET'),
      });
    } catch {
      throw new BadRequestException('Invalid or expired verification token');
    }

    if (payload.tokenType !== 'email-verification') {
      throw new BadRequestException('Invalid token type');
    }

    const user = await this.authRepository.findUserById(payload.sub);
    if (!user || user.deletedAt) {
      throw new NotFoundException('User not found');
    }

    if (user.emailVerified) {
      return; // Idempotent — already verified
    }

    await this.authRepository.updateUser(user.id, { emailVerified: true });
    this.logger.log(`Email verified for user: ${user.id}`, 'AuthService');
  }

  async resendVerification(userId: string, email: string): Promise<void> {
    const verificationToken = this.jwtService.sign(
      { sub: userId, tokenType: 'email-verification' },
      { expiresIn: 86400 }, // 24 hours
    );

    const appUrl = this.configService.get<string>('APP_URL', 'http://localhost:3100');
    const verifyLink = `${appUrl}/verify-email?token=${verificationToken}`;

    const user = await this.authRepository.findUserById(userId);
    const firstName = user?.firstName ?? 'there';

    await this.emailService.send({
      to: email,
      subject: 'Verify your Attune Smart Forms email address',
      html: brandEmailShell({
        title: 'Verify your email address',
        bodyHtml: `
          <p style="margin:0 0 16px;font-size:15px;color:#334155;">Hi <strong>${escapeHtml(firstName)}</strong>,</p>
          <p style="margin:0 0 24px;font-size:15px;color:#334155;line-height:1.6;">
            Thanks for starting your free trial. Please verify your email address to activate your account.</p>
          ${brandEmailButton(verifyLink, 'Verify Email')}
          <p style="margin:24px 0 0;font-size:12px;color:#64748B;">This link expires in <strong>24 hours</strong>. If you didn't create an account, you can ignore this email.</p>`,
      }),
    });

    this.logger.log(`Verification email sent for user ${userId}`, 'AuthService');
  }

  // --- Change own password ---

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.authRepository.findUserById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.passwordHash) {
      const valid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!valid) {
        throw new UnauthorizedException('Current password is incorrect');
      }
    }

    const policyResult = checkPasswordPolicy(newPassword, {
      firstName: user.firstName,
      lastName: user.lastName,
    });
    if (!policyResult.valid) {
      throw new BadRequestException(policyResult.errors.join(' '));
    }

    const hash = await bcrypt.hash(newPassword, this.bcryptRounds);
    await this.authRepository.updateUser(userId, {
      passwordHash: hash,
      mustChangePassword: false,
    });
    this.logger.log(`password.changed userId=${userId}`, 'AuthService');
  }

  // --- Private helpers ---

  private async issueTokenPair(
    userId: string,
    email: string,
    role: Role,
    organizationId: string,
    existingFamily?: string,
  ): Promise<AuthTokenPair> {
    const accessPayload: JwtPayload = {
      sub: userId,
      email,
      role,
      organizationId,
      tokenType: 'user',
    };

    const accessToken = this.jwtService.sign(accessPayload, {
      expiresIn: this.accessTtl,
    });

    const family = existingFamily ?? randomUUID();
    // jti ensures each refresh token is unique even if signed within the same second.
    // Refresh tokens use a separate secret so a compromised access secret cannot
    // forge refresh tokens.
    const rawRefreshToken = this.jwtService.sign(
      { sub: userId, family, tokenType: 'refresh', jti: randomUUID() },
      { expiresIn: this.refreshTtl, secret: this.refreshSecret },
    );

    // bcrypt truncates at 72 bytes — pre-hash with SHA-256 so the unique jti
    // (past the 72-byte prefix in the JWT) still differentiates tokens.
    const tokenHash = await bcrypt.hash(this.sha256(rawRefreshToken), this.bcryptRounds);
    const expiresAt = new Date(Date.now() + this.refreshTtl * 1000);

    await this.authRepository.createRefreshToken({
      tokenHash,
      family,
      expiresAt,
      user: { connect: { id: userId } },
    });

    // Clean up expired tokens in the background — keeps the table lean
    void this.authRepository.deleteExpiredRefreshTokens(userId).catch(() => undefined);

    return { accessToken, refreshToken: rawRefreshToken, expiresIn: this.accessTtl };
  }

  private async handleFailedAttempt(userId: string): Promise<void> {
    const updated = await this.authRepository.incrementFailedAttempts(userId);

    if (updated.failedAttempts >= MAX_FAILED_ATTEMPTS) {
      const lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
      await this.authRepository.lockAccount(userId, lockedUntil);
      this.logger.warn(`Account locked due to failed attempts: ${userId}`, 'AuthService');
    }
  }

  private sha256(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  private async availableSlug(name: string): Promise<string> {
    const base =
      name
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'org';

    // Self-serve signup must never fail on a name collision — suffix instead.
    let candidate = base;
    for (let i = 0; i < 20; i += 1) {
      const taken = await this.authRepository.findOrganizationBySlug(candidate);
      if (!taken) {
        return candidate;
      }
      candidate = `${base}-${Math.random().toString(36).slice(2, 6)}`;
    }
    throw new ConflictException('Could not generate a unique organization identifier');
  }
}
