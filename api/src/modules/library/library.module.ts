// Author: Robert Massey | Created: 2026-07-13 | Module: Library

import { Module } from '@nestjs/common';

import { LibraryController } from './library.controller';
import { LibraryRepository } from './library.repository';
import { LibraryService } from './library.service';

import { DocumentTemplatesModule } from '@/modules/document-templates/document-templates.module';
import { FormsModule } from '@/modules/forms/forms.module';
import { WorkflowsModule } from '@/modules/workflows/workflows.module';

@Module({
  imports: [FormsModule, WorkflowsModule, DocumentTemplatesModule],
  controllers: [LibraryController],
  providers: [LibraryRepository, LibraryService],
  exports: [LibraryService],
})
export class LibraryModule {}
