// Author: Robert Massey | Created: 2026-07-13 | Module: Workflows / DTO

import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class WorkflowNodeDto {
  @IsString()
  @IsNotEmpty()
  id!: string;

  // Node-type validity (against the shared-types catalog) is enforced by
  // publish validation, not the DTO — drafts may hold work-in-progress types.
  @IsString()
  @IsNotEmpty()
  type!: string;

  @IsObject()
  position!: { x: number; y: number };

  @IsObject()
  data!: Record<string, unknown>;
}

export class WorkflowEdgeDto {
  @IsString()
  @IsNotEmpty()
  id!: string;

  @IsString()
  @IsNotEmpty()
  source!: string;

  @IsString()
  @IsNotEmpty()
  target!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  label?: string;
}

export class CreateWorkflowDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowNodeDto)
  nodes?: WorkflowNodeDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowEdgeDto)
  edges?: WorkflowEdgeDto[];

  @IsOptional()
  @IsUUID()
  triggerFormId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  color?: string;
}
