// Author: Robert Massey | Created: 2026-07-12 | Module: Organizations

import { Injectable } from '@nestjs/common';
import { Organization, Prisma, Subscription } from '@prisma/client';

import { PrismaService } from '@/modules/common/prisma/prisma.service';

@Injectable()
export class OrganizationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<Organization | null> {
    return this.prisma.organization.findUnique({ where: { id } });
  }

  findWithSubscription(
    id: string,
  ): Promise<(Organization & { subscription: Subscription | null }) | null> {
    return this.prisma.organization.findUnique({
      where: { id },
      include: { subscription: true },
    });
  }

  update(id: string, data: Prisma.OrganizationUpdateInput): Promise<Organization> {
    return this.prisma.organization.update({ where: { id }, data });
  }
}
