// Author: Robert Massey | Created: 2026-07-13 | Module: Workflows / DTO
// formId: null unlinks the trigger; structural edits are rejected by the
// service when the workflow is PUBLISHED (unpublish first, like forms).

import { OmitType, PartialType } from '@nestjs/swagger';
import { IsUUID, ValidateIf } from 'class-validator';

import { CreateWorkflowDto } from './create-workflow.dto';

export class UpdateWorkflowDto extends PartialType(
  OmitType(CreateWorkflowDto, ['triggerFormId'] as const),
) {
  @ValidateIf((_object, value) => value !== null && value !== undefined)
  @IsUUID()
  triggerFormId?: string | null;
}
