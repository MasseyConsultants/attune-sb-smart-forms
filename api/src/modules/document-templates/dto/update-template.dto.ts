// Author: Robert Massey | Created: 2026-07-13 | Module: Document Templates
// Purpose: PATCH body — rename and/or (re)link the template to a form.
// formId: null unlinks (mappings are kept; they re-apply if relinked to the
// same form).

import { IsOptional, IsString, IsUUID, MaxLength, ValidateIf } from 'class-validator';

export class UpdateTemplateDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID()
  formId?: string | null;
}
