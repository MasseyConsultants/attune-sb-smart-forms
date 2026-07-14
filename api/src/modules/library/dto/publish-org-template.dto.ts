// Author: Robert Massey | Created: 2026-07-13 | Module: Library

import { LIBRARY_CATEGORIES } from '@attune-sb/shared-types';
import { IsIn, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class PublishOrgTemplateDto {
  @IsUUID()
  formId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  description!: string;

  @IsIn(LIBRARY_CATEGORIES as readonly string[])
  category!: string;

  @IsOptional()
  @IsUUID()
  workflowId?: string;
}
