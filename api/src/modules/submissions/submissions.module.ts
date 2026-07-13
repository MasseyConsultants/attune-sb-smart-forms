// Author: Robert Massey | Created: 2026-07-13 | Module: Submissions

import { Module } from '@nestjs/common';

import { PublicSubmissionsController, SubmissionsController } from './submissions.controller';
import { SubmissionsRepository } from './submissions.repository';
import { SubmissionsService } from './submissions.service';

import { FormsModule } from '@/modules/forms/forms.module';

@Module({
  imports: [FormsModule],
  controllers: [PublicSubmissionsController, SubmissionsController],
  providers: [SubmissionsRepository, SubmissionsService],
  exports: [SubmissionsService],
})
export class SubmissionsModule {}
