// Author: Robert Massey | Created: 2026-07-13 | Module: Admin

import { IsBoolean } from 'class-validator';

export class SetLegalHoldDto {
  @IsBoolean()
  hold!: boolean;
}
