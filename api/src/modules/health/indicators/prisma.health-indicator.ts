// Author: Robert Massey | Created: 2026-07-12 | Module: Health

import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';

import { PrismaService } from '@/modules/common/prisma/prisma.service';

@Injectable()
export class PrismaHealthIndicator extends HealthIndicator {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return this.getStatus(key, true);
    } catch (err) {
      throw new HealthCheckError(
        'Database check failed',
        this.getStatus(key, false, { message: err instanceof Error ? err.message : String(err) }),
      );
    }
  }
}
