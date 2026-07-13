// Author: Robert Massey | Created: 2026-07-12 | Module: Entitlements
// Global module: every domain module consumes EntitlementsService, and the
// EntitlementsGuard is registered app-wide from AppModule.

import { Global, Module } from '@nestjs/common';

import { EntitlementsGuard } from './entitlements.guard';
import { EntitlementsRepository } from './entitlements.repository';
import { EntitlementsService } from './entitlements.service';

@Global()
@Module({
  providers: [EntitlementsRepository, EntitlementsService, EntitlementsGuard],
  exports: [EntitlementsService, EntitlementsGuard, EntitlementsRepository],
})
export class EntitlementsModule {}
