// Author: Robert Massey | Created: 2026-07-13 | Module: Admin

import {
  IsDateString,
  IsDefined,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateOverrideDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  entitlement!: string;

  // Heterogeneous by design — numeric limit raises, boolean feature enables,
  // or string tier values; the entitlement key determines the type.
  @IsDefined()
  value!: number | boolean | string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
