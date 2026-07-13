// Author: Robert Massey | Created: 2026-07-12 | Module: Common / Logger
// Purpose: PII-aware logger that redacts sensitive fields before any log line is emitted.
// JSON format in production, human-readable in development. Rate-limited to 100 logs/s.
// Ported verbatim from the enterprise edition.

import { ConsoleLogger, Injectable, LogLevel } from '@nestjs/common';

// --- PII redaction patterns ---
// Applied in order — Bearer tokens are checked before the generic "token" key pattern.
const PII_PATTERNS: ReadonlyArray<[RegExp, string]> = [
  // HTTP Authorization header value
  [/Bearer\s+[A-Za-z0-9\-._~+/]+=*/g, 'Bearer [REDACTED]'],
  // JSON key patterns for sensitive field names
  [
    /("(?:password|secret|token|accessToken|refreshToken|apiKey|apiSecret|encryptionKey)")\s*:\s*"[^"]*"/gi,
    '$1:"[REDACTED]"',
  ],
  // Email addresses
  [/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, '[EMAIL]'],
  // 16–19 digit sequences that look like credit card numbers
  [/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{1,4}\b/g, '[CARD]'],
  // JWT-shaped strings outside of JSON keys
  [/eyJ[A-Za-z0-9\-_]+\.eyJ[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_.+/]*/g, '[JWT]'],
];

interface RateLimiterState {
  windowStart: number;
  count: number;
}

const MAX_LOGS_PER_SECOND = 100;

@Injectable()
export class SecureLoggerService extends ConsoleLogger {
  private readonly rateLimiter: RateLimiterState = {
    windowStart: Date.now(),
    count: 0,
  };

  private readonly isProd = process.env.NODE_ENV === 'production';

  override log(message: unknown, context?: string): void {
    if (this.isRateLimited()) {
      return;
    }
    super.log(this.format(message, 'LOG'), context ?? this.context);
  }

  override warn(message: unknown, context?: string): void {
    if (this.isRateLimited()) {
      return;
    }
    super.warn(this.format(message, 'WARN'), context ?? this.context);
  }

  override error(message: unknown, stack?: string, context?: string): void {
    // Errors bypass the rate limiter — never silently drop a real error.
    super.error(this.format(message, 'ERROR'), stack, context ?? this.context);
  }

  override debug(message: unknown, context?: string): void {
    if (this.isProd) {
      return;
    }
    if (this.isRateLimited()) {
      return;
    }
    super.debug(this.format(message, 'DEBUG'), context ?? this.context);
  }

  override verbose(message: unknown, context?: string): void {
    if (this.isProd) {
      return;
    }
    if (this.isRateLimited()) {
      return;
    }
    super.verbose(this.format(message, 'VERBOSE'), context ?? this.context);
  }

  private format(message: unknown, level: string): string {
    const redacted = this.redact(this.stringify(message));

    if (this.isProd) {
      return JSON.stringify({
        level: level.toLowerCase(),
        message: redacted,
        timestamp: new Date().toISOString(),
        context: this.context,
      });
    }

    return redacted;
  }

  private stringify(message: unknown): string {
    if (typeof message === 'string') {
      return message;
    }
    try {
      return JSON.stringify(message);
    } catch {
      return String(message);
    }
  }

  private redact(raw: string): string {
    return PII_PATTERNS.reduce(
      (acc, [pattern, replacement]) => acc.replace(pattern, replacement),
      raw,
    );
  }

  private isRateLimited(): boolean {
    const now = Date.now();
    if (now - this.rateLimiter.windowStart > 1000) {
      this.rateLimiter.windowStart = now;
      this.rateLimiter.count = 0;
    }
    this.rateLimiter.count += 1;
    return this.rateLimiter.count > MAX_LOGS_PER_SECOND;
  }

  logStructured(event: string, payload: Record<string, unknown>, level: LogLevel = 'log'): void {
    const message = this.isProd
      ? JSON.stringify({ event, ...payload, timestamp: new Date().toISOString() })
      : `[${event}] ${JSON.stringify(payload)}`;

    this[level](message);
  }
}
