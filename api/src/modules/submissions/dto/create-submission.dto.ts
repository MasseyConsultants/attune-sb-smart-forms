// Author: Robert Massey | Created: 2026-07-13 | Module: Submissions

import { IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateSubmissionDto {
  /** Flat map of fieldId → submitted value. */
  @IsObject()
  values!: Record<string, unknown>;

  /**
   * Honeypot. Rendered invisibly on public fill pages — humans leave it empty,
   * bots fill it. Non-empty values get a fake success and nothing is stored.
   */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  website?: string;
}
