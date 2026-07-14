// Author: Robert Massey | Created: 2026-07-13 | Module: notifications
// Purpose: The ONLY Prisma access for in-app notifications. Feeds are
// org-scoped; rows with userId null are visible to every org member, rows
// with a userId only to that user.

import { Injectable } from '@nestjs/common';
import { Notification, Prisma } from '@prisma/client';

import { PrismaService } from '@/modules/common/prisma/prisma.service';

const MAX_PER_ORG_SWEEP = 200;

@Injectable()
export class NotificationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: {
    organizationId: string;
    userId?: string | null;
    type: string;
    title: string;
    body: string;
    link?: string | null;
  }): Promise<Notification> {
    return this.prisma.notification.create({
      data: {
        organizationId: data.organizationId,
        userId: data.userId ?? null,
        type: data.type,
        title: data.title,
        body: data.body,
        link: data.link ?? null,
      },
    });
  }

  private visibleTo(organizationId: string, userId: string): Prisma.NotificationWhereInput {
    return { organizationId, OR: [{ userId: null }, { userId }] };
  }

  async findMany(
    organizationId: string,
    userId: string,
    page: number,
    pageSize: number,
  ): Promise<{ notifications: Notification[]; total: number; unreadCount: number }> {
    const where = this.visibleTo(organizationId, userId);
    const [notifications, total, unreadCount] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { ...where, readAt: null } }),
    ]);
    return { notifications, total, unreadCount };
  }

  async markRead(id: string, organizationId: string, userId: string): Promise<boolean> {
    const { count } = await this.prisma.notification.updateMany({
      where: { id, ...this.visibleTo(organizationId, userId), readAt: null },
      data: { readAt: new Date() },
    });
    return count > 0;
  }

  async markAllRead(organizationId: string, userId: string): Promise<number> {
    const { count } = await this.prisma.notification.updateMany({
      where: { ...this.visibleTo(organizationId, userId), readAt: null },
      data: { readAt: new Date() },
    });
    return count;
  }

  /** Keeps the per-org feed bounded — old read rows beyond the cap are deleted. */
  async pruneOld(organizationId: string): Promise<void> {
    const stale = await this.prisma.notification.findMany({
      where: { organizationId, readAt: { not: null } },
      orderBy: { createdAt: 'desc' },
      skip: MAX_PER_ORG_SWEEP,
      select: { id: true },
    });
    if (stale.length > 0) {
      await this.prisma.notification.deleteMany({
        where: { id: { in: stale.map((row) => row.id) } },
      });
    }
  }
}
