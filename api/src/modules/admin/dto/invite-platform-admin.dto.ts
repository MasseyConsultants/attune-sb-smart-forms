// Author: Robert Massey | Created: 2026-07-18 | Module: Admin

import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class InvitePlatformAdminDto {
  @IsEmail()
  @MaxLength(320)
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName!: string;
}
