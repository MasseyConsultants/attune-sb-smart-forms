// Author: Robert Massey | Created: 2026-07-13 | Module: notifications
// Guard order (global): JWT → Roles → ReadOnly → Entitlements → OrgThrottler.
// Mark-read mutations are @AllowReadOnly — a read-only org's members must
// still be able to manage their own feed (the rows carry no customer data).

import { NotificationsList } from '@attune-sb/shared-types';
import { Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

import { InAppNotificationsService } from './in-app-notifications.service';

import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '@/modules/auth/strategies/jwt.strategy';
import { AllowReadOnly } from '@/modules/lifecycle/decorators/allow-read-only.decorator';

class ListNotificationsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize: number = 20;
}

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: InAppNotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'List notifications for the current user (org-wide + targeted)' })
  list(
    @Query() query: ListNotificationsQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<NotificationsList> {
    return this.notifications.list(user.organizationId, user.userId, query.page, query.pageSize);
  }

  @Post(':id/read')
  @AllowReadOnly()
  @HttpCode(204)
  @ApiOperation({ summary: 'Mark one notification read' })
  async markRead(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.notifications.markRead(id, user.organizationId, user.userId);
  }

  @Post('read-all')
  @AllowReadOnly()
  @HttpCode(204)
  @ApiOperation({ summary: 'Mark every visible notification read' })
  async markAllRead(@CurrentUser() user: AuthenticatedUser): Promise<void> {
    await this.notifications.markAllRead(user.organizationId, user.userId);
  }
}
