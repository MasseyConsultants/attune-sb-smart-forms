// Author: Robert Massey | Created: 2026-07-13 | Module: Document Templates
// Purpose: Multipart body fields accompanying the uploaded file.

import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class UploadTemplateDto {
  /** Display name; defaults to the original filename. */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  /** Form to link immediately (mappings target this form's fields). */
  @IsOptional()
  @IsUUID()
  formId?: string;
}
