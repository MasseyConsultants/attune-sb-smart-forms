// Author: Robert Massey | Created: 2026-07-12 | Module: Auth
// Purpose: Auth endpoints — parse/validate/delegate only, business logic in AuthService.
// Public endpoints opt out of the global JwtAuthGuard via @Public().

import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { AuthService, LoginResult, SignupResult, AuthTokenPair } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import {
  ForgotPasswordDto,
  ResetPasswordDto,
  ChangePasswordDto,
  VerifyEmailDto,
} from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { SignupDto } from './dto/signup.dto';
import type { AuthenticatedUser } from './strategies/jwt.strategy';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('signup')
  // Signup is a hot abuse target — tighter throttle than the global default.
  @Throttle({ short: { limit: 3, ttl: 60_000 } })
  @ApiOperation({ summary: 'Self-serve signup — creates org, OWNER user, and 14-day trial' })
  signup(@Body() dto: SignupDto): Promise<SignupResult> {
    return this.authService.signup(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Email + password login' })
  login(@Body() dto: LoginDto): Promise<LoginResult> {
    return this.authService.login(dto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate the refresh token and issue a new access token' })
  refresh(@Body() dto: RefreshTokenDto): Promise<AuthTokenPair> {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke all refresh tokens for the current user' })
  async logout(@CurrentUser() user: AuthenticatedUser): Promise<{ loggedOut: true }> {
    await this.authService.logout(user.userId);
    return { loggedOut: true };
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { limit: 3, ttl: 60_000 } })
  @ApiOperation({ summary: 'Send a password reset email (always returns 200)' })
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<{ sent: true }> {
    await this.authService.forgotPassword(dto.email);
    return { sent: true };
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password using a one-time emailed token' })
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<{ reset: true }> {
    await this.authService.resetPassword(dto.token, dto.newPassword);
    return { reset: true };
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change own password (requires current password)' })
  async changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
  ): Promise<{ changed: true }> {
    await this.authService.changePassword(user.userId, dto.currentPassword, dto.newPassword);
    return { changed: true };
  }

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify an email address using an emailed token' })
  async verifyEmail(@Body() dto: VerifyEmailDto): Promise<{ verified: true }> {
    await this.authService.verifyEmail(dto.token);
    return { verified: true };
  }

  @Public()
  @Get('verify-email')
  @ApiOperation({ summary: 'Verify an email address via link click (GET with query token)' })
  async verifyEmailByLink(@Query('token') token: string): Promise<{ verified: true }> {
    await this.authService.verifyEmail(token);
    return { verified: true };
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { limit: 2, ttl: 60_000 } })
  @ApiOperation({ summary: 'Resend the email verification link' })
  async resendVerification(@CurrentUser() user: AuthenticatedUser): Promise<{ sent: true }> {
    await this.authService.resendVerification(user.userId, user.email);
    return { sent: true };
  }
}
