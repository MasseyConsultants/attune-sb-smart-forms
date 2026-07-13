// Author: Robert Massey | Created: 2026-07-13 | Module: Document Templates
// Purpose: REST surface for SmartMapper templates. Uploads flow multipart
// through the API (local-disk storage — no presign; see ADR-0003). Multer's
// static ceiling is the largest plan's maxUploadBytes; the service enforces
// the org's actual plan limit.

import {
  PLAN_ENTITLEMENTS,
  DocumentTemplateDetail,
  DocumentTemplateSummary,
} from '@attune-sb/shared-types';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import type { Response } from 'express';

import {
  DocumentTemplatesService,
  UploadedFile as TemplateFile,
} from './document-templates.service';
import { UpdateMappingsDto } from './dto/update-mappings.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { UploadTemplateDto } from './dto/upload-template.dto';

import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import type { AuthenticatedUser } from '@/modules/auth/strategies/jwt.strategy';

// Multer hard ceiling — the biggest plan's per-file cap. Plan-specific limits
// are enforced in the service from the org's snapshot.
const MULTER_MAX_BYTES = PLAN_ENTITLEMENTS.business.limits.maxUploadBytes;

@ApiTags('Document Templates')
@Controller('document-templates')
export class DocumentTemplatesController {
  constructor(private readonly service: DocumentTemplatesService) {}

  @Get()
  @ApiOperation({ summary: "List the org's document templates" })
  list(@CurrentUser() user: AuthenticatedUser): Promise<DocumentTemplateSummary[]> {
    return this.service.findAll(user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Template detail (geometry + mappings)' })
  get(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<DocumentTemplateDetail> {
    return this.service.findOne(id, user);
  }

  @Get(':id/pdf')
  @ApiOperation({ summary: 'Raw PDF bytes for the mapping canvas' })
  async pdf(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ): Promise<void> {
    const { buffer, name } = await this.service.getPdfBuffer(id, user);
    const safeName = name.replace(/[^a-z0-9-_ ]/gi, '').trim() || 'template';
    res
      .set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${safeName}.pdf"`,
        'Cache-Control': 'private, max-age=60',
      })
      .send(buffer);
  }

  @Post()
  @Roles(Role.BUILDER)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MULTER_MAX_BYTES } }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a PDF/DOCX template (plan-gated)' })
  upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadTemplateDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<DocumentTemplateDetail> {
    return this.service.upload(file as TemplateFile, dto, user);
  }

  @Patch(':id')
  @Roles(Role.BUILDER)
  @ApiOperation({ summary: 'Rename or (re)link the template to a form' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTemplateDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<DocumentTemplateDetail> {
    return this.service.update(id, dto, user);
  }

  @Put(':id/mappings')
  @Roles(Role.BUILDER)
  @ApiOperation({ summary: 'Replace the field coordinate mappings' })
  saveMappings(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMappingsDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<DocumentTemplateDetail> {
    return this.service.saveMappings(id, dto, user);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a template (blobs + row, ADMIN+)' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    return this.service.remove(id, user);
  }
}
