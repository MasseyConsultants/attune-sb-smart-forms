// Author: Robert Massey | Created: 2026-07-12 | Module: Invitations

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';

import { AcceptInviteDto } from './dto/accept-invite.dto';
import { CreateInviteDto } from './dto/create-invite.dto';
import { InvitationsService, InviteDto } from './invitations.service';

import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { Public } from '@/modules/auth/decorators/public.decorator';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import type { AuthenticatedUser } from '@/modules/auth/strategies/jwt.strategy';

@ApiTags('Invitations')
@Controller('invitations')
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Invite a team member (ADMIN+)' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateInviteDto,
  ): Promise<{ id: string; email: string }> {
    return this.invitationsService.createInvite(
      user,
      dto.email,
      dto.firstName,
      dto.lastName,
      dto.role,
    );
  }

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'List pending invites for the org (ADMIN+)' })
  listPending(@CurrentUser() user: AuthenticatedUser): Promise<InviteDto[]> {
    return this.invitationsService.listPending(user);
  }

  @Public()
  @Get('validate')
  @ApiOperation({ summary: 'Validate an invite token (public, from the accept-invite page)' })
  validate(@Query('token') token: string): Promise<InviteDto> {
    return this.invitationsService.validateInviteToken(token);
  }

  @Public()
  @Post('accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept an invite and create the user account (public)' })
  accept(@Body() dto: AcceptInviteDto): Promise<{ userId: string; email: string }> {
    return this.invitationsService.acceptInvite(dto.token, dto.password);
  }

  @Post(':id/resend')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend an invite with a fresh token (ADMIN+)' })
  resend(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ id: string; email: string }> {
    return this.invitationsService.resendInvite(id, user);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Revoke a pending invite (ADMIN+)' })
  async revoke(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ revoked: true }> {
    await this.invitationsService.revokeInvite(id, user);
    return { revoked: true };
  }
}
