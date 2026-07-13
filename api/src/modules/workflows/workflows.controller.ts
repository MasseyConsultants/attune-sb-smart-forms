// Author: Robert Massey | Created: 2026-07-13 | Module: Workflows
// Guard order (global): JWT → Roles → ReadOnly → Entitlements → OrgThrottler.
// Mutations require BUILDER+; delete requires ADMIN+ — mirrors forms.

import type {
  WorkflowDetail,
  WorkflowRunDetail,
  WorkflowRunSummary,
  WorkflowSummary,
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
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';

import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { ListWorkflowsQueryDto } from './dto/list-workflows-query.dto';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';
import { WorkflowsService } from './workflows.service';

import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import type { AuthenticatedUser } from '@/modules/auth/strategies/jwt.strategy';

@ApiTags('Workflows')
@Controller('workflows')
export class WorkflowsController {
  constructor(private readonly workflowsService: WorkflowsService) {}

  @Get()
  @ApiOperation({ summary: 'List workflows (paginated, org-scoped)' })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListWorkflowsQueryDto,
  ): Promise<{ workflows: WorkflowSummary[]; total: number }> {
    return this.workflowsService.findAll(query, user);
  }

  @Get('runs/:runId')
  @ApiOperation({ summary: 'Get one run with its step ledger' })
  getRun(
    @Param('runId', ParseUUIDPipe) runId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<WorkflowRunDetail> {
    return this.workflowsService.findRun(runId, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a workflow with its full graph' })
  get(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<WorkflowDetail> {
    return this.workflowsService.findOne(id, user);
  }

  @Get(':id/runs')
  @ApiOperation({ summary: 'List runs for a workflow (newest first)' })
  listRuns(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<{ runs: WorkflowRunSummary[]; total: number }> {
    const pageNum = Math.max(1, Number(page) || 1);
    const size = Math.min(100, Math.max(1, Number(pageSize) || 20));
    return this.workflowsService.findRuns(id, pageNum, size, user);
  }

  @Post()
  @Roles(Role.BUILDER)
  @ApiOperation({ summary: 'Create a draft workflow' })
  create(
    @Body() dto: CreateWorkflowDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<WorkflowDetail> {
    return this.workflowsService.create(dto, user);
  }

  @Patch(':id')
  @Roles(Role.BUILDER)
  @ApiOperation({ summary: 'Update a workflow (graph edits require DRAFT status)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWorkflowDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<WorkflowDetail> {
    return this.workflowsService.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(204)
  @ApiOperation({ summary: 'Soft-delete a workflow (ADMIN+)' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    return this.workflowsService.remove(id, user);
  }

  @Post(':id/publish')
  @Roles(Role.BUILDER)
  @ApiOperation({
    summary: 'Publish (graph validation + plan-tier node gate; snapshots a version)',
  })
  publish(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<WorkflowDetail> {
    return this.workflowsService.publish(id, user);
  }

  @Post(':id/unpublish')
  @Roles(Role.BUILDER)
  @ApiOperation({ summary: 'Unpublish back to draft (in-flight runs finish on their version)' })
  unpublish(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<WorkflowDetail> {
    return this.workflowsService.unpublish(id, user);
  }
}
