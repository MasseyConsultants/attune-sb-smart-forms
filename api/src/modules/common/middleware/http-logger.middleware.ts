// Author: Robert Massey | Created: 2026-07-12 | Module: Common / Middleware
// Purpose: Request/response logging with duration. Skips health-check noise.

import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

import { SecureLoggerService } from '@/modules/common/logger/secure-logger.service';

@Injectable()
export class HttpLoggerMiddleware implements NestMiddleware {
  constructor(private readonly logger: SecureLoggerService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    // Health probes fire every few seconds — logging them drowns real traffic.
    if (req.path.startsWith('/api/v1/health')) {
      next();
      return;
    }

    const start = Date.now();
    res.on('finish', () => {
      const ms = Date.now() - start;
      const line = `${req.method} ${req.path} ${res.statusCode} ${ms}ms`;
      if (res.statusCode >= 500) {
        this.logger.error(line, undefined, 'HTTP');
      } else if (res.statusCode >= 400) {
        this.logger.warn(line, 'HTTP');
      } else {
        this.logger.log(line, 'HTTP');
      }
    });
    next();
  }
}
