// Author: Robert Massey | Created: 2026-07-12 | Module: Organizations
// Purpose: Org profile + subscription summary for the current tenant.

import type { PlanId, SubscriptionSummary } from '@attune-sb/shared-types';
import { Injectable, NotFoundException } from '@nestjs/common';
import { SubscriptionStatus } from '@prisma/client';

import { OrganizationsRepository } from './organizations.repository';

export interface OrganizationDto {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly lifecycleState: string;
  readonly createdAt: string;
  readonly subscription: SubscriptionSummary | null;
}

@Injectable()
export class OrganizationsService {
  constructor(private readonly organizationsRepository: OrganizationsRepository) {}

  async getCurrent(organizationId: string): Promise<OrganizationDto> {
    const org = await this.organizationsRepository.findWithSubscription(organizationId);
    if (!org || org.deletedAt) {
      throw new NotFoundException('Organization not found');
    }

    const sub = org.subscription;
    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      lifecycleState: org.lifecycleState,
      createdAt: org.createdAt.toISOString(),
      subscription: sub
        ? {
            planId: sub.planId as PlanId,
            status: sub.status as unknown as SubscriptionSummary['status'],
            trialEndsAt: sub.trialEndsAt?.toISOString() ?? null,
            currentPeriodEnd: sub.currentPeriodEnd?.toISOString() ?? null,
            billingAnchorDay: sub.billingAnchorDay,
            seats: sub.seats,
            isStripeManaged:
              sub.stripeSubscriptionId !== null && sub.status !== SubscriptionStatus.TRIALING,
          }
        : null,
    };
  }

  async rename(organizationId: string, name: string): Promise<OrganizationDto> {
    await this.organizationsRepository.update(organizationId, { name });
    return this.getCurrent(organizationId);
  }
}
