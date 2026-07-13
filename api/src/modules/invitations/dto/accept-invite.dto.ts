// Author: Robert Massey | Created: 2026-07-12 | Module: Invitations

import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class AcceptInviteDto {
  @IsString()
  @IsNotEmpty()
  token!: string;

  @IsString()
  @MinLength(12)
  @MaxLength(128)
  password!: string;
}
