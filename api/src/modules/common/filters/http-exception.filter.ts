// Author: Robert Massey | Created: 2026-07-12 | Module: Common / Filters
// Purpose: Two-tier global exception handling ported from the enterprise edition:
//   1. HttpExceptionFilter — maps NestJS HttpExceptions to the standard envelope.
//   2. AllExceptionsFilter — catch-all that sanitizes unexpected errors to 500
//      without leaking stack traces or internal details (OWASP A09).
// Ops-event recording (SB-025, the deferred P6 observability pass): 5xx faults
// land in the OpsEvent ledger as API_ERROR; 403s are recorded as SECURITY
// authz denials. Recording is fire-and-forget inside OpsEventsService.

import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { OpsEventKind, OpsEventSeverity } from '@prisma/client';
import { Request, Response } from 'express';

import { OpsEventsService } from '@/modules/ops/ops-events.service';

interface NestValidationBody {
  readonly message: string | string[];
  // Usually a string label, but e.g. Terminus puts the failing-indicator map here.
  readonly error?: unknown;
  readonly statusCode?: number;
  readonly details?: unknown;
}

interface ErrorEnvelope {
  readonly success: false;
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly details?: unknown;
  };
}

interface RequestActor {
  readonly userId?: string;
  readonly organizationId?: string;
}

function requestActor(request: Request): RequestActor {
  const user = (request as Request & { user?: { userId?: string; organizationId?: string } }).user;
  return { userId: user?.userId, organizationId: user?.organizationId };
}

function requestId(request: Request): string | undefined {
  const header = request.headers?.['x-request-id'];
  return typeof header === 'string' ? header : undefined;
}

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  constructor(private readonly opsEvents: OpsEventsService) {}

  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const body = exception.getResponse();

    const envelope = this.buildEnvelope(body, exception);

    // Only log 5xx errors — 4xx are expected client errors, not platform faults.
    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `[${status}] ${envelope.error.code}: ${envelope.error.message} (${request.method} ${request.path})`,
        exception.stack,
      );
    }
    this.recordOpsEvent(status, envelope.error.code, envelope.error.message, request);

    response.status(status).json(envelope);
  }

  private recordOpsEvent(status: number, code: string, message: string, request: Request): void {
    const base = {
      statusCode: status,
      method: request.method,
      path: request.path,
      requestId: requestId(request),
      ip: request.ip,
      ...requestActor(request),
      context: { code },
    };

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.opsEvents.record({
        kind: OpsEventKind.API_ERROR,
        severity: OpsEventSeverity.ERROR,
        type: 'http.5xx',
        message,
        ...base,
      });
    } else if (status === HttpStatus.FORBIDDEN) {
      // Role/tenant denials are a security signal (cross-org probing, privilege
      // escalation attempts). 401s are deliberately NOT recorded — expired
      // tokens are routine noise.
      this.opsEvents.record({
        kind: OpsEventKind.SECURITY,
        severity: OpsEventSeverity.WARNING,
        type: 'authz.denied',
        message,
        ...base,
      });
    }
  }

  private buildEnvelope(body: string | object, exception: HttpException): ErrorEnvelope {
    if (typeof body === 'string') {
      return {
        success: false,
        error: { code: 'HTTP_EXCEPTION', message: body },
      };
    }

    const typed = body as NestValidationBody;
    const message = Array.isArray(typed.message)
      ? typed.message.join('; ')
      : (typed.message ?? exception.message);

    const errorLabel = typeof typed.error === 'string' ? typed.error : undefined;
    const code = this.deriveErrorCode(errorLabel, exception);

    // Non-string `error` payloads (e.g. Terminus indicator results) are surfaced as details.
    const details = Array.isArray(typed.message)
      ? typed.message
      : (typed.details ?? (typeof typed.error === 'object' ? typed.error : undefined) ?? undefined);

    return {
      success: false,
      error: {
        code,
        message,
        ...(details !== undefined ? { details } : {}),
      },
    };
  }

  private deriveErrorCode(nestErrorLabel: string | undefined, exception: HttpException): string {
    // Custom domain exceptions can carry an explicit code via the response body's
    // `error` label (e.g. LIMIT_EXCEEDED) — preserve it verbatim when SCREAMING_SNAKE.
    if (nestErrorLabel) {
      if (/^[A-Z0-9_]+$/.test(nestErrorLabel)) {
        return nestErrorLabel;
      }
      return nestErrorLabel.toUpperCase().replace(/\s+/g, '_');
    }
    return exception.constructor.name
      .replace(/Exception$/, '')
      .replace(/([A-Z])/g, '_$1')
      .toUpperCase()
      .replace(/^_/, '');
  }
}

// --- Catch-all: sanitises unexpected runtime errors into 500 without stack exposure ---

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly opsEvents: OpsEventsService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Let HttpExceptionFilter handle proper HTTP exceptions
    if (exception instanceof HttpException) {
      return;
    }

    const message = exception instanceof Error ? exception.message : 'Internal server error';
    this.logger.error(
      `Unhandled exception: ${message}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    // CRITICAL: an unhandled (non-HttpException) fault is a code defect, not a
    // mapped domain error — these are the first thing an admin should triage.
    this.opsEvents.record({
      kind: OpsEventKind.API_ERROR,
      severity: OpsEventSeverity.CRITICAL,
      type: 'http.unhandled',
      message,
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      method: request.method,
      path: request.path,
      requestId: requestId(request),
      ip: request.ip,
      ...requestActor(request),
    });

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred. Please try again later.',
      },
    });
  }
}
