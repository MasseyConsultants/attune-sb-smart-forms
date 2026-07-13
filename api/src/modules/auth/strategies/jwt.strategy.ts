// Author: Robert Massey | Created: 2026-07-12 | Module: Auth
// Purpose: Passport JWT strategy — validates the bearer token on every protected request.
// The tokenType claim ensures only user access tokens are accepted here.

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { AuthRepository } from '../auth.repository';

export interface JwtPayload {
  readonly sub: string;
  readonly email: string;
  readonly role: Role;
  readonly organizationId: string;
  readonly tokenType: 'user';
}

// Shape placed on request.user after successful validation.
export interface AuthenticatedUser {
  readonly userId: string;
  readonly email: string;
  readonly role: Role;
  readonly organizationId: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly authRepository: AuthRepository,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    if (payload.tokenType !== 'user') {
      throw new UnauthorizedException('Invalid token type');
    }

    const user = await this.authRepository.findUserById(payload.sub);
    if (!user || user.deletedAt || !user.isActive) {
      throw new UnauthorizedException('Account not found or deactivated');
    }

    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
      organizationId: payload.organizationId,
    };
  }
}
