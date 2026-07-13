// Author: Robert Massey | Created: 2026-07-13 | Module: Common / Storage

import { Global, Module } from '@nestjs/common';

import { BlobStorageService } from './blob-storage.service';

@Global()
@Module({
  providers: [BlobStorageService],
  exports: [BlobStorageService],
})
export class StorageModule {}
