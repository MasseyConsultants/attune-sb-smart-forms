// Author: Robert Massey | Created: 2026-07-13 | Module: Document Templates
// Purpose: PUT /mappings body — the full replacement set of coordinate
// mappings. Mirrors the FieldCoordinateMapping shared-types contract.

import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class FieldMappingDto {
  @IsString()
  @MaxLength(100)
  fieldId!: string;

  @IsString()
  @MaxLength(500)
  fieldLabel!: string;

  @IsInt()
  @Min(0)
  page!: number;

  @IsNumber()
  x!: number;

  @IsNumber()
  y!: number;

  @IsNumber()
  @Min(1)
  width!: number;

  @IsNumber()
  @Min(1)
  height!: number;

  @IsOptional()
  @IsNumber()
  @Min(4)
  fontSize?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  answerOption?: string;

  @IsOptional()
  @IsIn(['value', 'checkmark', 'highlight'])
  renderMode?: 'value' | 'checkmark' | 'highlight';

  @IsOptional()
  @IsString()
  @MaxLength(9)
  highlightColor?: string;
}

export class UpdateMappingsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FieldMappingDto)
  mappings!: FieldMappingDto[];
}
