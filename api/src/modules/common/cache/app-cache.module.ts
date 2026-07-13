// Author: Robert Massey | Created: 2026-07-12 | Module: Common / Cache

import { Global, Module } from '@nestjs/common';

import { AppCacheService } from './app-cache.service';

@Global()
@Module({
  providers: [AppCacheService],
  exports: [AppCacheService],
})
export class AppCacheModule {}
