// Author: Robert Massey | Created: 2026-07-12 | Module: Health

import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import Redis from 'ioredis';

const PING_TIMEOUT_MS = 2000;

@Injectable()
export class RedisHealthIndicator extends HealthIndicator implements OnModuleDestroy {
  private client: Redis | null = null;

  constructor(private readonly config: ConfigService) {
    super();
  }

  onModuleDestroy(): void {
    this.client?.disconnect();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      const client = this.getClient();
      const pong = await Promise.race([
        client.ping(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Redis ping timeout')), PING_TIMEOUT_MS),
        ),
      ]);
      if (pong !== 'PONG') {
        throw new Error(`Unexpected ping response: ${String(pong)}`);
      }
      return this.getStatus(key, true);
    } catch (err) {
      throw new HealthCheckError(
        'Redis check failed',
        this.getStatus(key, false, { message: err instanceof Error ? err.message : String(err) }),
      );
    }
  }

  private getClient(): Redis {
    if (!this.client) {
      this.client = new Redis({
        host: this.config.get<string>('REDIS_HOST', 'localhost'),
        port: this.config.get<number>('REDIS_PORT', 6379),
        password: this.config.get<string>('REDIS_PASSWORD') || undefined,
        lazyConnect: false,
        // Offline queue lets a ping issued before the connection is ready wait for
        // it instead of failing immediately; the ping timeout race still bounds it.
        enableOfflineQueue: true,
        maxRetriesPerRequest: 1,
      });
      this.client.on('error', () => undefined); // reported via failed pings
    }
    return this.client;
  }
}
