// Author: Robert Massey | Created: 2026-07-13 | Module: Forms
// Guard order (global): JWT → Roles → ReadOnly → Entitlements → OrgThrottler.
// Mutations require BUILDER+; destructive actions (delete/archive) require ADMIN+.
// ReadOnlyGuard blocks every non-GET here automatically for read-only orgs.

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
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';

import { CreateFormDto } from './dto/create-form.dto';
import { ListFormsQueryDto } from './dto/list-forms-query.dto';
import { PublishFormDto, RepublishFormDto } from './dto/publish-form.dto';
import { UpdateFormDto } from './dto/update-form.dto';
import { FormDto, FormsService, FormVersionDto, PaginatedFormDtos } from './forms.service';

import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import type { AuthenticatedUser } from '@/modules/auth/strategies/jwt.strategy';

@ApiTags('Forms')
@Controller('forms')
export class FormsController {
  constructor(private readonly formsService: FormsService) {}

  @Get()
  @ApiOperation({ summary: 'List forms (paginated, org-scoped)' })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListFormsQueryDto,
  ): Promise<PaginatedFormDtos> {
    return this.formsService.findAll(user.organizationId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a form with its full schema' })
  get(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<FormDto> {
    return this.formsService.findOne(id, user);
  }

  @Get(':id/versions')
  @ApiOperation({ summary: 'Published version history' })
  versions(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<FormVersionDto[]> {
    return this.formsService.findVersions(id, user);
  }

  @Post()
  @Roles(Role.BUILDER)
  @ApiOperation({ summary: 'Create a draft form' })
  create(@Body() dto: CreateFormDto, @CurrentUser() user: AuthenticatedUser): Promise<FormDto> {
    return this.formsService.create(dto, user);
  }

  @Patch(':id')
  @Roles(Role.BUILDER)
  @ApiOperation({ summary: 'Update a draft form (name, description, schema)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFormDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<FormDto> {
    return this.formsService.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(204)
  @ApiOperation({ summary: 'Soft-delete a form (ADMIN+)' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    return this.formsService.remove(id, user);
  }

  @Post(':id/publish')
  @Roles(Role.BUILDER)
  @ApiOperation({ summary: 'Publish a draft (gated by the activeForms plan cap)' })
  publish(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PublishFormDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<FormDto> {
    return this.formsService.publish(id, dto, user);
  }

  @Post(':id/unpublish')
  @Roles(Role.BUILDER)
  @ApiOperation({ summary: 'Unpublish back to draft (always allowed)' })
  unpublish(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<FormDto> {
    return this.formsService.unpublish(id, user);
  }

  @Post(':id/republish')
  @Roles(Role.BUILDER)
  @ApiOperation({ summary: 'Re-publish a live form with an updated schema (bumps version)' })
  republish(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RepublishFormDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<FormDto> {
    return this.formsService.republish(id, dto, user);
  }

  @Post(':id/archive')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Archive a published form (ADMIN+)' })
  archive(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<FormDto> {
    return this.formsService.archive(id, user);
  }

  @Post(':id/duplicate')
  @Roles(Role.BUILDER)
  @ApiOperation({ summary: 'Duplicate a form as a new draft' })
  duplicate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<FormDto> {
    return this.formsService.duplicate(id, user);
  }

  @Post(':id/slug')
  @Roles(Role.BUILDER)
  @ApiOperation({ summary: 'Regenerate the public slug (old links stop resolving)' })
  regenerateSlug(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<FormDto> {
    return this.formsService.regenerateSlug(id, user);
  }
}
