// Author: Robert Massey | Created: 2026-07-16 | Module: Ops

import { OpsEventKind, OpsEventSeverity } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

export class ListOpsEventsQueryDto {
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
  @IsEnum(OpsEventKind)
  kind?: OpsEventKind;

  @IsOptional()
  @IsEnum(OpsEventSeverity)
  severity?: OpsEventSeverity;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  type?: string;

  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;
}
