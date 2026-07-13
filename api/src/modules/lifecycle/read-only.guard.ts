// Author: Robert Massey | Created: 2026-07-12 | Module: Lifecycle / Guard
// Purpose: Enforces read-only mode for orgs past trial expiry / cancellation.
// Reads (GET/HEAD/OPTIONS) always pass — viewing and export are never taken
// away. Mutations are denied with ORG_READ_ONLY unless the route opted out
// via @AllowReadOnly() (billing/resubscribe, logout, exports).

import { CanActivate, ExecutionContext, HttpException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { ALLOW_READ_ONLY_KEY } from './decorators/allow-read-only.decorator';
import { LifecycleService } from './lifecycle.service';

import type { AuthenticatedUser } from '@/modules/auth/strategies/jwt.strategy';

const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export class OrgReadOnlyException extends HttpException {
  constructor() {
    super(
      {
        message:
          'This workspace is read-only. Viewing and exporting still work — resubscribe to restore full access.',
        error: 'ORG_READ_ONLY',
      },
      403,
    );
  }
}

@Injectable()
export class ReadOnlyGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly lifecycleService: LifecycleService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<{ method: string; user?: AuthenticatedUser }>();

    if (READ_METHODS.has(request.method) || !request.user?.organizationId) {
      return true;
    }

    const allowed = this.reflector.getAllAndOverride<boolean | undefined>(ALLOW_READ_ONLY_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (allowed) {
      return true;
    }

    if (await this.lifecycleService.isReadOnly(request.user.organizationId)) {
      throw new OrgReadOnlyException();
    }
    return true;
  }
}
