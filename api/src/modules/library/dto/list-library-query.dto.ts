// Author: Robert Massey | Created: 2026-07-13 | Module: Library

import { LIBRARY_CATEGORIES } from '@attune-sb/shared-types';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

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
  @Max(100)
  pageSize: number = 50;

  @IsOptional()
  @IsIn(LIBRARY_CATEGORIES as readonly string[])
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;
}
