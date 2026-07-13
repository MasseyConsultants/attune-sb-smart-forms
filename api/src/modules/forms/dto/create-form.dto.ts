// Author: Robert Massey | Created: 2026-07-13 | Module: Forms

import type { FormSchema } from '@attune-sb/shared-types';
import { IsNotEmpty, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateFormDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  // Structural validation of fields happens at publish time (FormsService.validateSchema);
  // drafts may be saved in any intermediate state the builder produces.
  @IsOptional()
  @IsObject()
  schema?: FormSchema;
}
