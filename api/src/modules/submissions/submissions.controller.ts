// Author: Robert Massey | Created: 2026-07-13 | Module: Submissions
// Two surfaces:
//   PublicSubmissionsController — @Public() slug-addressed intake for /f/[slug];
//     tight IP throttle (the org-scoped guard falls back to IP when unauthenticated).
//   SubmissionsController — authenticated data views + export, org-scoped.

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Ip,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Role } from '@prisma/client';
import type { Response } from 'express';

import { CreateSubmissionDto } from './dto/create-submission.dto';
import { ListOrgSubmissionsQueryDto } from './dto/list-org-submissions-query.dto';
import { ListSubmissionsQueryDto } from './dto/list-submissions-query.dto';
import { writeCsv, writeXlsx } from './export-writer';
import {
  IntakeResult,
  PaginatedOrgSubmissionDtos,
  PaginatedSubmissionDtos,
  PublicFormDto,
  SubmissionDto,
  SubmissionsService,
} from './submissions.service';

import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { Public } from '@/modules/auth/decorators/public.decorator';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import type { AuthenticatedUser } from '@/modules/auth/strategies/jwt.strategy';
import { DocumentFillsService } from '@/modules/document-fills/document-fills.service';

@ApiTags('Public Forms')
@Controller('public/forms')
export class PublicSubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  @Get(':slug')
  @Public()
  @ApiOperation({ summary: 'Published form schema for the public fill page' })
  getForm(@Param('slug') slug: string): Promise<PublicFormDto> {
    return this.submissionsService.getPublicForm(slug);
  }

  @Post(':slug/submissions')
  @Public()
  // Per-IP intake budget: 5/s burst, 30/min sustained — spam containment
  // without blocking a legitimate kiosk or event booth.
  @Throttle({ short: { limit: 5, ttl: 1_000 }, long: { limit: 30, ttl: 60_000 } })
  @HttpCode(201)
  @ApiOperation({ summary: 'Public submission intake (never rejected for plan limits)' })
  intake(
    @Param('slug') slug: string,
    @Body() dto: CreateSubmissionDto,
    @Ip() ip: string,
  ): Promise<IntakeResult> {
    return this.submissionsService.intake(slug, dto, ip);
  }
}

@ApiTags('Submissions')
@Controller()
export class SubmissionsController {
  constructor(
    private readonly submissionsService: SubmissionsService,
    private readonly documentFills: DocumentFillsService,
  ) {}

  @Get('forms/:formId/submissions')
  @ApiOperation({ summary: 'List submissions for a form (quarantined rows counted, not shown)' })
  list(
    @Param('formId', ParseUUIDPipe) formId: string,
    @Query() query: ListSubmissionsQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PaginatedSubmissionDtos> {
    return this.submissionsService.findAll(formId, query, user);
  }

  @Get('forms/:formId/submissions/export')
  @ApiOperation({ summary: 'Export submissions as CSV or XLSX' })
  async export(
    @Param('formId', ParseUUIDPipe) formId: string,
    @Query('format') format: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ): Promise<void> {
    const { formName, columns, rows } = await this.submissionsService.exportData(formId, user);
    const safeName = formName.replace(/[^a-z0-9-_ ]/gi, '').trim() || 'submissions';

    if (format === 'xlsx') {
      const buffer = await writeXlsx(formName, columns, rows);
      res
        .set({
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${safeName}.xlsx"`,
        })
        .send(buffer);
      return;
    }

    res
      .set({
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${safeName}.csv"`,
      })
      .send(writeCsv(columns, rows));
  }

  @Get('submissions')
  @ApiOperation({ summary: 'Org-wide submissions across all forms (filter, search)' })
  listForOrg(
    @Query() query: ListOrgSubmissionsQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PaginatedOrgSubmissionDtos> {
    return this.submissionsService.findAllForOrg(query, user);
  }

  // Declared before 'submissions/:id' so 'export' is never parsed as a UUID.
  @Get('submissions/export')
  @ApiOperation({ summary: 'Org-wide CSV export (heterogeneous forms; values as JSON)' })
  async exportForOrg(
    @Query() query: ListOrgSubmissionsQueryDto,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ): Promise<void> {
    const rows = await this.submissionsService.exportOrgData(query, user);
    const csvRows = rows.map((row) => ({
      ...row,
      data: {
        __form: row.formName,
        __values: JSON.stringify(row.data),
      } as Record<string, unknown>,
    }));
    const csv = writeCsv(
      [
        { id: '__form', label: 'Form' },
        { id: '__values', label: 'Values (JSON)' },
      ],
      csvRows,
    );
    res
      .set({
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="all-submissions.csv"',
      })
      .send(csv);
  }

  @Get('submissions/:id')
  @ApiOperation({ summary: 'Submission detail' })
  get(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SubmissionDto> {
    return this.submissionsService.findOne(id, user);
  }

  @Get('submissions/:id/document')
  @ApiOperation({ summary: 'Download the SmartMapper-filled PDF for a submission' })
  async downloadFilledDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ): Promise<void> {
    const { buffer, filename } = await this.documentFills.getFilledPdf(id, user);
    res
      .set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      })
      .send(buffer);
  }

  @Delete('submissions/:id')
  @Roles(Role.ADMIN)
  @HttpCode(204)
  @ApiOperation({ summary: 'Soft-delete a submission (ADMIN+)' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    return this.submissionsService.remove(id, user);
  }
}
