// Author: Robert Massey | Created: 2026-07-13 | Module: Library

import { LIBRARY_CATEGORIES, LIBRARY_INDUSTRY_TAGS } from '@attune-sb/shared-types';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

function toOptionalBoolean(value: unknown): boolean | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (value === true || value === 'true' || value === '1') return true;
  if (value === false || value === 'false' || value === '0') return false;
  return undefined;
}

export class ListLibraryQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  pageSize: number = 50;

  @IsOptional()
  @IsIn(LIBRARY_CATEGORIES as readonly string[])
  category?: string;

  /** Single industry tag facet (SB-029). */
  @IsOptional()
  @IsIn(LIBRARY_INDUSTRY_TAGS as readonly string[])
  tag?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @IsOptional()
  @Transform(({ value }) => toOptionalBoolean(value))
  @IsBoolean()
  hasDocument?: boolean;

  @IsOptional()
  @Transform(({ value }) => toOptionalBoolean(value))
  @IsBoolean()
  hasWorkflow?: boolean;
}
