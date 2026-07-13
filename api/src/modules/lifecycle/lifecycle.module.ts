// Author: Robert Massey | Created: 2026-07-12 | Module: Lifecycle
// Global: ReadOnlyGuard is registered app-wide from AppModule and the billing
// webhook service calls restore() on resubscribe.

import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';

import { LifecycleController } from './lifecycle.controller';
import { LifecycleProcessor, LifecycleScheduler, LIFECYCLE_QUEUE } from './lifecycle.processor';
import { LifecycleRepository } from './lifecycle.repository';
import { LifecycleService } from './lifecycle.service';
import { ReadOnlyGuard } from './read-only.guard';

@Global()
@Module({
  imports: [BullModule.registerQueue({ name: LIFECYCLE_QUEUE })],
  controllers: [LifecycleController],
  providers: [
    LifecycleRepository,
    LifecycleService,
    LifecycleProcessor,
    LifecycleScheduler,
    ReadOnlyGuard,
  ],
  exports: [LifecycleService, ReadOnlyGuard],
})
export class LifecycleModule {}
