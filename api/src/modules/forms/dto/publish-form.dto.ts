// Author: Robert Massey | Created: 2026-07-13 | Module: Forms

import type { FormSchema } from '@attune-sb/shared-types';
import { IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class PublishFormDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  changelog?: string;
}

export class RepublishFormDto extends PublishFormDto {
  /** Optional replacement schema — lets the builder re-publish edits in one call. */
  @IsOptional()
  @IsObject()
  schema?: FormSchema;
}
