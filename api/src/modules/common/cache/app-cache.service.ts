// Author: Robert Massey | Created: 2026-07-12 | Module: Common / Cache
// Purpose: Thin ioredis wrapper providing get/set/del/delByPattern semantics.
// All failures are swallowed so a Redis outage degrades gracefully (requests
// fall through to the database). Ported from the enterprise edition.
//
// Key space: asb:cache:<domain>:<qualifier>
// Examples:  asb:cache:usage:orgId:SUBMISSIONS
//            asb:cache:subscription:orgId

import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

const KEY_PREFIX = 'asb:cache:';

@Injectable()
export class AppCacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AppCacheService.name);
  private client!: Redis;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    this.client = new Redis({
      host: this.config.get<string>('REDIS_HOST', 'localhost'),
      port: this.config.get<number>('REDIS_PORT', 6379),
      password: this.config.get<string>('REDIS_PASSWORD') || undefined,
      enableOfflineQueue: false,
    });
    this.client.on('error', (err: Error) =>
      this.logger.warn(`Redis cache client error: ${err.message}`),
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit().catch(() => this.client.disconnect());
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await this.client.get(`${KEY_PREFIX}${key}`);
      if (!raw) {
        return null;
      }
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    try {
      await this.client.set(`${KEY_PREFIX}${key}`, JSON.stringify(value), 'EX', ttlSeconds);
    } catch (err) {
      this.logger.warn(
        `Cache set failed for "${key}": ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.client.del(`${KEY_PREFIX}${key}`);
    } catch {
      // stale cache is acceptable
    }
  }

  // Removes all keys matching a glob pattern within the app key space.
  // Uses SCAN so it never blocks the Redis event loop.
  async delByPattern(pattern: string): Promise<void> {
    try {
      const fullPattern = `${KEY_PREFIX}${pattern}`;
      const keys: string[] = [];
      let cursor = '0';
      do {
        const [next, batch] = await this.client.scan(cursor, 'MATCH', fullPattern, 'COUNT', '200');
        cursor = next;
        keys.push(...batch);
      } while (cursor !== '0');

      if (keys.length > 0) {
        await this.client.del(...keys);
      }
    } catch (err) {
      this.logger.warn(
        `Cache delByPattern failed for "${pattern}": ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
