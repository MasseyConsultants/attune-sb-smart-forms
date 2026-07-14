// Author: Robert Massey | Created: 2026-07-13 | Module: notifications
// Purpose: In-app notification feed. emit() is fire-and-forget by contract —
// a notification is never worth failing the action that produced it, so
// failures are logged and swallowed. Reads go through list/markRead with
// tenant + user scoping in the repository.

import { NotificationItem, NotificationsList, NotificationType } from '@attune-sb/shared-types';
import { Injectable } from '@nestjs/common';
import { Notification } from '@prisma/client';

import { NotificationsRepository } from './notifications.repository';

import { SecureLoggerService } from '@/modules/common/logger/secure-logger.service';

export interface EmitNotificationInput {
  readonly organizationId: string;
  /** Omit to notify every member of the org. */
  readonly userId?: string;
  readonly type: NotificationType;
  readonly title: string;
  readonly body: string;
  readonly link?: string;
}

function toItem(row: Notification): NotificationItem {
  return {
    id: row.id,
    type: row.type as NotificationType,
    title: row.title,
    body: row.body,
    link: row.link,
    readAt: row.readAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

@Injectable()
export class InAppNotificationsService {
  constructor(
    private readonly repository: NotificationsRepository,
    private readonly logger: SecureLoggerService,
  ) {}

  /** Never throws — the producing action must not fail on a feed write. */
  async emit(input: EmitNotificationInput): Promise<void> {
    try {
      await this.repository.create({
        organizationId: input.organizationId,
        userId: input.userId ?? null,
        type: input.type,
        title: input.title,
        body: input.body,
        link: input.link ?? null,
      });
    } catch (err) {
      this.logger.error(
        `notification.emit failed org=${input.organizationId} type=${input.type}: ${err instanceof Error ? err.message : String(err)}`,
        undefined,
        'InAppNotificationsService',
      );
    }
  }

  async list(
    organizationId: string,
    userId: string,
    page: number,
    pageSize: number,
  ): Promise<NotificationsList> {
    const { notifications, total, unreadCount } = await this.repository.findMany(
      organizationId,
      userId,
      page,
      pageSize,
    );
    return { notifications: notifications.map(toItem), total, unreadCount };
  }

  async markRead(id: string, organizationId: string, userId: string): Promise<void> {
    await this.repository.markRead(id, organizationId, userId);
  }

  async markAllRead(organizationId: string, userId: string): Promise<void> {
    await this.repository.markAllRead(organizationId, userId);
    // Piggyback feed pruning on the cheapest interactive moment.
    await this.repository.pruneOld(organizationId).catch(() => undefined);
  }
}
