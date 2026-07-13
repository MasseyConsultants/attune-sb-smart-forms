// Author: Robert Massey | Created: 2026-07-13 | Module: Document Templates

import { Module } from '@nestjs/common';

import { AutoMapperService } from './auto-mapper/auto-mapper.service';
import { GroupValidatorService } from './auto-mapper/group-validator.service';
import { DocumentTemplatesController } from './document-templates.controller';
import { DocumentTemplatesRepository } from './document-templates.repository';
import { DocumentTemplatesService } from './document-templates.service';

import { EntitlementsModule } from '@/modules/entitlements/entitlements.module';
import { FormsModule } from '@/modules/forms/forms.module';

@Module({
  imports: [EntitlementsModule, FormsModule],
  controllers: [DocumentTemplatesController],
  providers: [
    DocumentTemplatesRepository,
    DocumentTemplatesService,
    AutoMapperService,
    GroupValidatorService,
  ],
  exports: [DocumentTemplatesService, DocumentTemplatesRepository],
})
export class DocumentTemplatesModule {}
