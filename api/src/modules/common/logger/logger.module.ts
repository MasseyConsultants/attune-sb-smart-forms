// Author: Robert Massey | Created: 2026-07-12 | Module: Common / Logger

import { Global, Module } from '@nestjs/common';

import { SecureLoggerService } from './secure-logger.service';

@Global()
@Module({
  providers: [SecureLoggerService],
  exports: [SecureLoggerService],
})
export class LoggerModule {}
