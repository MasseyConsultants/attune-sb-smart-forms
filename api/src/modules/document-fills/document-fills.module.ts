// Author: Robert Massey | Created: 2026-07-13 | Module: Document Fills

import { Module } from '@nestjs/common';

import { DocumentFillsRepository } from './document-fills.repository';
import { DocumentFillsService } from './document-fills.service';

import { DocumentTemplatesModule } from '@/modules/document-templates/document-templates.module';
import { EntitlementsModule } from '@/modules/entitlements/entitlements.module';

@Module({
  imports: [DocumentTemplatesModule, EntitlementsModule],
  providers: [DocumentFillsRepository, DocumentFillsService],
  exports: [DocumentFillsService, DocumentFillsRepository],
})
export class DocumentFillsModule {}
