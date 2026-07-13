// Author: Robert Massey | Created: 2026-07-12 | Module: Auth

import { IsBoolean, IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class SignupDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(12)
  @MaxLength(128)
  password!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  organizationName!: string;

  @IsBoolean()
  acceptedTerms!: boolean;
}
