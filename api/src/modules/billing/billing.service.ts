// Author: Robert Massey | Created: 2026-07-12 | Module: Billing
// Purpose: Checkout + Portal session creation and the subscription summary.
// Stripe is only called here to CREATE sessions (user-initiated, not on the
// entitlement path) — access decisions always read the local Subscription row.

import type {
  CheckoutSessionResponse,
  PaidPlanId,
  PortalSessionResponse,
  SubscriptionSummary,
} from '@attune-sb/shared-types';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SubscriptionStatus } from '@prisma/client';

import { BillingRepository } from './billing.repository';
import { BillingInterval, StripeClientService } from './stripe-client.service';

@Injectable()
export class BillingService {
  constructor(
    private readonly repository: BillingRepository,
    private readonly stripe: StripeClientService,
    private readonly config: ConfigService,
  ) {}

  async getSubscriptionSummary(organizationId: string): Promise<SubscriptionSummary> {
    const sub = await this.repository.findSubscription(organizationId);
    if (!sub) {
      throw new NotFoundException('No subscription found for this organization');
    }
    return {
      planId: sub.planId as SubscriptionSummary['planId'],
      status: sub.status as unknown as SubscriptionSummary['status'],
      trialEndsAt: sub.trialEndsAt?.toISOString() ?? null,
      currentPeriodEnd: sub.currentPeriodEnd?.toISOString() ?? null,
      billingAnchorDay: sub.billingAnchorDay,
      seats: sub.seats,
      isStripeManaged:
        sub.stripeSubscriptionId !== null && sub.status !== SubscriptionStatus.TRIALING,
    };
  }

  /** Stripe Checkout session for trial→paid conversion or plan changes. */
  async createCheckoutSession(
    organizationId: string,
    userEmail: string,
    planId: PaidPlanId,
    interval: BillingInterval,
  ): Promise<CheckoutSessionResponse> {
    const sub = await this.repository.findSubscription(organizationId);
    if (!sub) {
      throw new NotFoundException('No subscription found for this organization');
    }
    if (sub.stripeSubscriptionId && sub.status === SubscriptionStatus.ACTIVE) {
      throw new BadRequestException(
        'Organization already has an active subscription — use the billing portal to change plans',
      );
    }

    const client = this.stripe.getClient();
    const priceId = this.stripe.priceIdFor(planId, interval);
    const appUrl = this.config.get<string>('APP_URL', 'http://localhost:3100');

    const session = await client.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      customer: sub.stripeCustomerId ?? undefined,
      customer_email: sub.stripeCustomerId ? undefined : userEmail,
      client_reference_id: organizationId,
      metadata: { organizationId, planId },
      subscription_data: { metadata: { organizationId, planId } },
      success_url: `${appUrl}/billing?checkout=success`,
      cancel_url: `${appUrl}/billing?checkout=canceled`,
      allow_promotion_codes: true,
    });

    if (!session.url) {
      throw new BadRequestException('Stripe did not return a checkout URL');
    }
    return { url: session.url };
  }

  /** Stripe Billing Portal — card updates, plan changes, cancellation. */
  async createPortalSession(organizationId: string): Promise<PortalSessionResponse> {
    const sub = await this.repository.findSubscription(organizationId);
    if (!sub?.stripeCustomerId) {
      throw new BadRequestException('No billing account exists yet — complete a checkout first');
    }

    const client = this.stripe.getClient();
    const appUrl = this.config.get<string>('APP_URL', 'http://localhost:3100');
    const session = await client.billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: `${appUrl}/billing`,
    });
    return { url: session.url };
  }
}
