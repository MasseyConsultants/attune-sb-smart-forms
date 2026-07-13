// Author: Robert Massey | Created: 2026-07-12 | Module: common/encryption

import { Global, Module } from '@nestjs/common';

import { EncryptionService } from './encryption.service';

@Global()
@Module({
  providers: [EncryptionService],
  exports: [EncryptionService],
})
export class EncryptionModule {}
