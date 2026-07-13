// Author: Robert Massey | Created: 2026-07-12 | Module: Health Check
// Purpose: Liveness and readiness endpoints used by Docker health checks and CI smoke tests.
// GET /api/v1/health          — lightweight liveness probe (no external calls)
// GET /api/v1/health/detailed — readiness probe verifying DB + Redis + memory

import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  HealthCheckResult,
  MemoryHealthIndicator,
} from '@nestjs/terminus';

import { Public } from '../auth/decorators/public.decorator';

import { PrismaHealthIndicator } from './indicators/prisma.health-indicator';
import { RedisHealthIndicator } from './indicators/redis.health-indicator';

@ApiTags('Health')
@Public()
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly memory: MemoryHealthIndicator,
    private readonly redis: RedisHealthIndicator,
    private readonly db: PrismaHealthIndicator,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Liveness probe — confirms the process is running' })
  liveness(): { status: string; version: string; timestamp: string; uptime: number } {
    return {
      status: 'ok',
      version: process.env.APP_VERSION ?? '0.1.0',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  @Get('detailed')
  @HealthCheck()
  @ApiOperation({ summary: 'Readiness probe — checks DB, Redis, and memory thresholds' })
  readiness(): Promise<HealthCheckResult> {
    return this.health.check([
      () => this.db.isHealthy('database'),
      () => this.redis.isHealthy('redis'),
      // Heap below 512 MB — catches leaks before OOM kills.
      () => this.memory.checkHeap('memory_heap', 512 * 1024 * 1024),
      () => this.memory.checkRSS('memory_rss', 1024 * 1024 * 1024),
    ]);
  }
}
