// Author: Robert Massey | Created: 2026-07-12 | Module: App Root
// Purpose: Root NestJS module — registers global guards, imports domain modules.
// Guard execution order (declaration order): JWT → Roles → OrgThrottler.
// Entitlements guard slots in between Roles and OrgThrottler in S1.

import { BullModule } from '@nestjs/bullmq';
import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';

import { envValidationSchema } from './config/env.validation';
import { AuthModule } from './modules/auth/auth.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { BillingModule } from './modules/billing/billing.module';
import { AppCacheModule } from './modules/common/cache/app-cache.module';
import { EncryptionModule } from './modules/common/encryption/encryption.module';
import {
  HttpExceptionFilter,
  AllExceptionsFilter,
} from './modules/common/filters/http-exception.filter';
import { OrgThrottlerGuard } from './modules/common/guards/org-throttler.guard';
import { RolesGuard } from './modules/common/guards/roles.guard';
import { LoggerModule } from './modules/common/logger/logger.module';
import { HttpLoggerMiddleware } from './modules/common/middleware/http-logger.middleware';
import { PrismaModule } from './modules/common/prisma/prisma.module';
import { EntitlementsGuard } from './modules/entitlements/entitlements.guard';
import { EntitlementsModule } from './modules/entitlements/entitlements.module';
import { HealthModule } from './modules/health/health.module';
import { InvitationsModule } from './modules/invitations/invitations.module';
import { LifecycleModule } from './modules/lifecycle/lifecycle.module';
import { ReadOnlyGuard } from './modules/lifecycle/read-only.guard';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../.env'],
      validationSchema: envValidationSchema,
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),

    // BullMQ root connection — the lifecycle sweep (and later doc-gen/workflow
    // queues) share this Redis connection config.
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
          password: config.get<string>('REDIS_PASSWORD') || undefined,
        },
      }),
    }),

    ThrottlerModule.forRoot([
      // short: 20 req/s per org — the web BFF issues several parallel calls per page.
      {
        name: 'short',
        ttl: parseInt(process.env.THROTTLE_SHORT_TTL ?? '1000', 10),
        limit: parseInt(process.env.THROTTLE_SHORT_LIMIT ?? '20', 10),
      },
      {
        name: 'medium',
        ttl: parseInt(process.env.THROTTLE_MEDIUM_TTL ?? '10000', 10),
        limit: parseInt(process.env.THROTTLE_MEDIUM_LIMIT ?? '100', 10),
      },
      {
        name: 'long',
        ttl: parseInt(process.env.THROTTLE_LONG_TTL ?? '60000', 10),
        limit: parseInt(process.env.THROTTLE_LONG_LIMIT ?? '300', 10),
      },
    ]),

    // --- Infrastructure (all @Global) ---
    LoggerModule,
    PrismaModule,
    AppCacheModule,
    EncryptionModule,
    NotificationsModule,

    // --- Domain modules ---
    HealthModule,
    AuthModule,
    UsersModule,
    OrganizationsModule,
    InvitationsModule,
    EntitlementsModule,
    LifecycleModule,
    BillingModule,
  ],
  providers: [
    // NestJS applies APP_FILTERs in reverse declaration order — the catch-all
    // runs last at runtime so HttpExceptionFilter handles typed exceptions first.
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },

    // Guard execution order (declaration order):
    //   1. JwtAuthGuard      — validates bearer token, populates request.user (@Public() opts out)
    //   2. RolesGuard        — enforces @Roles() hierarchy
    //   3. ReadOnlyGuard    — blocks mutations for read-only orgs (@AllowReadOnly() opts out)
    //   4. EntitlementsGuard — enforces @RequireEntitlement() boolean plan gates
    //   5. OrgThrottlerGuard — per-org rate limiting
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: ReadOnlyGuard },
    { provide: APP_GUARD, useClass: EntitlementsGuard },
    { provide: APP_GUARD, useClass: OrgThrottlerGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(HttpLoggerMiddleware).forRoutes('*');
  }
}
