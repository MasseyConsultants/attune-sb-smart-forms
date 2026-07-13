// Author: Robert Massey | Created: 2026-07-13 | Module: Forms

import { Module } from '@nestjs/common';

import { FormsController } from './forms.controller';
import { FormsRepository } from './forms.repository';
import { FormsService } from './forms.service';

@Module({
  controllers: [FormsController],
  providers: [FormsRepository, FormsService],
  exports: [FormsService, FormsRepository],
})
export class FormsModule {}
