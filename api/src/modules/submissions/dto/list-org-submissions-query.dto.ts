// Author: Robert Massey | Created: 2026-07-14 | Module: Submissions
// Org-wide data view filters: by form, by the team member who owns the form,
// and free-text search across submission values.

import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

import { ListSubmissionsQueryDto } from './list-submissions-query.dto';

export class ListOrgSubmissionsQueryDto extends ListSubmissionsQueryDto {
  @IsOptional()
  @IsUUID()
  formId?: string;

  /** Filter to forms created by this team member. */
  @IsOptional()
  @IsUUID()
  createdById?: string;

  /** Case-insensitive search across submitted values. */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;
}
