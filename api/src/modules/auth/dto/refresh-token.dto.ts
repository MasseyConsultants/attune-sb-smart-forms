// Author: Robert Massey | Created: 2026-07-12 | Module: Auth

import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}
