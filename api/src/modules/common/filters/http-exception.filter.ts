// Author: Robert Massey | Created: 2026-07-12 | Module: Common / Filters
// Purpose: Two-tier global exception handling ported from the enterprise edition:
//   1. HttpExceptionFilter — maps NestJS HttpExceptions to the standard envelope.
//   2. AllExceptionsFilter — catch-all that sanitizes unexpected errors to 500
//      without leaking stack traces or internal details (OWASP A09).
// Security-event recording is deferred to the observability pass (P6) — the
// enterprise SecurityEventsService is not ported at Sprint 0.

import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

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

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

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

    response.status(status).json(envelope);
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

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    // Let HttpExceptionFilter handle proper HTTP exceptions
    if (exception instanceof HttpException) {
      return;
    }

    const message = exception instanceof Error ? exception.message : 'Internal server error';
    this.logger.error(
      `Unhandled exception: ${message}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred. Please try again later.',
      },
    });
  }
}
