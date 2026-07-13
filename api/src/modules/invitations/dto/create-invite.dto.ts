// Author: Robert Massey | Created: 2026-07-12 | Module: Invitations

import { Role } from '@prisma/client';
import { IsEmail, IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateInviteDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName!: string;

  @IsEnum(Role)
  role!: Role;
}
