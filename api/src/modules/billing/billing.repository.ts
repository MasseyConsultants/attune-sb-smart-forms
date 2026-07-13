// Author: Robert Massey | Created: 2026-07-12 | Module: Billing
// Purpose: The ONLY Prisma access for billing. Webhook dedupe uses the Stripe
// event id as PK — an insert collision means the event was already processed.

import { Injectable } from '@nestjs/common';
import { Prisma, Subscription } from '@prisma/client';

import { PrismaService } from '@/modules/common/prisma/prisma.service';

@Injectable()
export class BillingRepository {
  constructor(private readonly prisma: PrismaService) {}

  findSubscription(organizationId: string): Promise<Subscription | null> {
    return this.prisma.subscription.findUnique({ where: { organizationId } });
  }

  findSubscriptionByStripeCustomer(stripeCustomerId: string): Promise<Subscription | null> {
    return this.prisma.subscription.findFirst({ where: { stripeCustomerId } });
  }

  findSubscriptionByStripeSubscription(stripeSubscriptionId: string): Promise<Subscription | null> {
    return this.prisma.subscription.findFirst({ where: { stripeSubscriptionId } });
  }

  updateSubscription(id: string, data: Prisma.SubscriptionUpdateInput): Promise<Subscription> {
    return this.prisma.subscription.update({ where: { id }, data });
  }

  /**
   * Attaches the Stripe payment-method fingerprint to the org's trial-abuse
   * record. Survives purge, so a card that already funded a trial org cannot
   * farm additional free trials later.
   */
  attachPaymentFingerprint(
    organizationId: string,
    paymentHash: string,
  ): Promise<Prisma.BatchPayload> {
    return this.prisma.trialFingerprint.updateMany({
      where: { organizationId, paymentHash: null },
      data: { paymentHash },
    });
  }

  /**
   * Records a webhook event id. Returns false when the id was already recorded,
   * signalling the handler to skip (idempotent replay).
   */
  async recordWebhookEvent(eventId: string, type: string): Promise<boolean> {
    try {
      await this.prisma.stripeWebhookEvent.create({ data: { id: eventId, type } });
      return true;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        return false;
      }
      throw err;
    }
  }
}
