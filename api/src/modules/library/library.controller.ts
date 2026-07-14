// Author: Robert Massey | Created: 2026-07-13 | Module: Library
// Guard order (global): JWT → Roles → ReadOnly → Entitlements → OrgThrottler.
// The curated gallery is @Public() — it doubles as an SEO/acquisition surface,
// so browse + detail need no auth (global throttler still applies). Everything
// that touches an org (clone, org templates, publish) is authenticated;
// ReadOnlyGuard blocks clone/publish for read-only orgs automatically.

import {
  CloneTemplateResponse,
  LibraryTemplateDetail,
  LibraryTemplateSummary,
} from '@attune-sb/shared-types';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';

import { ListLibraryQueryDto } from './dto/list-library-query.dto';
import { PublishOrgTemplateDto } from './dto/publish-org-template.dto';
import { LibraryService } from './library.service';

import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { Public } from '@/modules/auth/decorators/public.decorator';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import type { AuthenticatedUser } from '@/modules/auth/strategies/jwt.strategy';

@ApiTags('Library')
@Controller('library')
export class LibraryController {
  constructor(private readonly libraryService: LibraryService) {}

  // --- Curated public gallery (no auth) ---

  @Get()
  @Public()
  @ApiOperation({ summary: 'Browse the curated template gallery (public)' })
  browse(
    @Query() query: ListLibraryQueryDto,
  ): Promise<{ templates: LibraryTemplateSummary[]; total: number }> {
    return this.libraryService.browsePublic(query);
  }

  // --- Org templates (authenticated; declared before :slug so it wins routing) ---

  @Get('org')
  @ApiOperation({ summary: "List the org's own published templates" })
  browseOrg(
    @Query() query: ListLibraryQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ templates: LibraryTemplateSummary[]; total: number }> {
    return this.libraryService.browseOrg(query, user);
  }

  @Get('org/:id')
  @ApiOperation({ summary: 'Get an org template with its full schema' })
  getOrgTemplate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<LibraryTemplateDetail> {
    return this.libraryService.getOrgTemplate(id, user);
  }

  @Post('publish')
  @Roles(Role.BUILDER)
  @ApiOperation({ summary: 'Publish an own form as an org template (publishOrgTemplates gate)' })
  publishOrgTemplate(
    @Body() dto: PublishOrgTemplateDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<LibraryTemplateDetail> {
    return this.libraryService.publishOrgTemplate(dto, user);
  }

  @Delete('org/:id')
  @Roles(Role.ADMIN)
  @HttpCode(204)
  @ApiOperation({ summary: 'Soft-delete an org template (ADMIN+)' })
  removeOrgTemplate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    return this.libraryService.removeOrgTemplate(id, user);
  }

  // --- Clone (authenticated) ---

  @Post(':id/clone')
  @Roles(Role.BUILDER)
  @ApiOperation({ summary: 'Clone a template into the org as a draft form (+ workflow)' })
  clone(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CloneTemplateResponse> {
    return this.libraryService.clone(id, user);
  }

  // --- Public detail (last: catch-all slug route) ---

  @Get(':slug')
  @Public()
  @ApiOperation({ summary: 'Get a curated template with its full schema (public)' })
  getPublic(@Param('slug') slug: string): Promise<LibraryTemplateDetail> {
    return this.libraryService.getPublicBySlug(slug);
  }
}
