// Author: Robert Massey | Created: 2026-07-12 | Module: Billing / Webhooks
// Purpose: Verified, idempotent Stripe webhook handlers. Each handler only
// mutates the local Subscription row (Stripe is billing input, never the
// entitlement authority) and then invalidates the org's entitlement cache.
// Dedupe: the Stripe event id is recorded before processing; replays are no-ops.

import { createHash } from 'crypto';

import { BadRequestException, Injectable } from '@nestjs/common';
import { Subscription, SubscriptionStatus } from '@prisma/client';
import Stripe from 'stripe';

import { BillingRepository } from './billing.repository';
import { StripeClientService } from './stripe-client.service';

import { SecureLoggerService } from '@/modules/common/logger/secure-logger.service';
import { EntitlementsService } from '@/modules/entitlements/entitlements.service';
import { LifecycleService } from '@/modules/lifecycle/lifecycle.service';

const CONTEXT = 'StripeWebhookService';

@Injectable()
export class StripeWebhookService {
  constructor(
    private readonly repository: BillingRepository,
    private readonly stripe: StripeClientService,
    private readonly entitlements: EntitlementsService,
    private readonly lifecycle: LifecycleService,
    private readonly logger: SecureLoggerService,
  ) {}

  verifyAndParse(rawBody: Buffer, signature: string): Stripe.Event {
    try {
      return this.stripe
        .getClient()
        .webhooks.constructEvent(rawBody, signature, this.stripe.webhookSecret);
    } catch (err) {
      throw new BadRequestException(
        `Webhook signature verification failed: ${err instanceof Error ? err.message : 'unknown'}`,
      );
    }
  }

  async handleEvent(event: Stripe.Event): Promise<{ processed: boolean }> {
    const isNew = await this.repository.recordWebhookEvent(event.id, event.type);
    if (!isNew) {
      this.logger.log(`Skipping replayed webhook event ${event.id} (${event.type})`, CONTEXT);
      return { processed: false };
    }

    switch (event.type) {
      case 'checkout.session.completed':
        await this.onCheckoutCompleted(event.data.object);
        break;
      case 'customer.subscription.updated':
        await this.onSubscriptionUpdated(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await this.onSubscriptionDeleted(event.data.object);
        break;
      case 'invoice.payment_failed':
        await this.onInvoicePaymentFailed(event.data.object);
        break;
      case 'invoice.paid':
        await this.onInvoicePaid(event.data.object);
        break;
      default:
        this.logger.log(`Ignoring unhandled webhook event type ${event.type}`, CONTEXT);
    }
    return { processed: true };
  }

  // --- Handlers ---

  private async onCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    const organizationId = session.metadata?.organizationId ?? session.client_reference_id;
    const planId = session.metadata?.planId;
    if (!organizationId || !planId) {
      this.logger.warn(`checkout.session.completed without org metadata (${session.id})`, CONTEXT);
      return;
    }

    const local = await this.repository.findSubscription(organizationId);
    if (!local) {
      this.logger.warn(`No local subscription for org ${organizationId}`, CONTEXT);
      return;
    }

    const stripeSubscriptionId = this.asId(session.subscription);
    const stripeCustomerId = this.asId(session.customer);

    // Off the request path — fetching the subscription for period dates is fine.
    const remote = stripeSubscriptionId
      ? await this.stripe
          .getClient()
          .subscriptions.retrieve(stripeSubscriptionId, { expand: ['default_payment_method'] })
      : null;

    const periodStart = this.periodStart(remote);
    await this.repository.updateSubscription(local.id, {
      planId,
      status: SubscriptionStatus.ACTIVE,
      stripeCustomerId,
      stripeSubscriptionId,
      trialEndsAt: null,
      currentPeriodEnd: this.periodEnd(remote),
      // Usage counters reset on the day-of-month the paid period started.
      billingAnchorDay: periodStart ? periodStart.getUTCDate() : local.billingAnchorDay,
      pastDueSince: null,
      cancelAtPeriodEnd: false,
    });
    await this.entitlements.invalidate(organizationId);
    await this.recordPaymentFingerprint(organizationId, remote);
    // Resubscribe path: an expired-trial/canceled org gets instant full restore.
    await this.lifecycle.restoreIfReadOnly(organizationId, 'checkout-resubscribe');
    this.logger.log(`Org ${organizationId} converted to ${planId} via checkout`, CONTEXT);
  }

  /**
   * Trial-abuse heuristic: hash the card fingerprint onto the org's
   * TrialFingerprint row so a purged trial org cannot re-trial with the same card.
   */
  private async recordPaymentFingerprint(
    organizationId: string,
    subscription: Stripe.Subscription | null,
  ): Promise<void> {
    const paymentMethod = subscription?.default_payment_method;
    const fingerprint =
      paymentMethod && typeof paymentMethod !== 'string'
        ? paymentMethod.card?.fingerprint
        : undefined;
    if (!fingerprint) {
      return;
    }
    const paymentHash = createHash('sha256').update(fingerprint).digest('hex');
    await this.repository.attachPaymentFingerprint(organizationId, paymentHash);
  }

  private async onSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    const local = await this.repository.findSubscriptionByStripeSubscription(subscription.id);
    if (!local) {
      this.logger.warn(`subscription.updated for unknown subscription ${subscription.id}`, CONTEXT);
      return;
    }

    const priceId = subscription.items.data[0]?.price?.id;
    const lookup = priceId ? this.stripe.lookupPrice(priceId) : null;

    await this.repository.updateSubscription(local.id, {
      ...(lookup ? { planId: lookup.planId } : {}),
      status: this.mapStatus(subscription.status),
      currentPeriodEnd: this.periodEnd(subscription),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    });
    await this.entitlements.invalidate(local.organizationId);
  }

  private async onSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    const local = await this.repository.findSubscriptionByStripeSubscription(subscription.id);
    if (!local) {
      return;
    }
    await this.repository.updateSubscription(local.id, {
      status: SubscriptionStatus.CANCELED,
      cancelAtPeriodEnd: false,
    });
    await this.entitlements.invalidate(local.organizationId);
    this.logger.log(`Org ${local.organizationId} subscription canceled`, CONTEXT);
  }

  private async onInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    const local = await this.findByInvoiceCustomer(invoice);
    if (!local) {
      return;
    }
    await this.repository.updateSubscription(local.id, {
      status: SubscriptionStatus.PAST_DUE,
      // First failure starts the dunning clock; later failures keep the original.
      pastDueSince: local.pastDueSince ?? new Date(),
    });
    await this.entitlements.invalidate(local.organizationId);
    this.logger.warn(`Org ${local.organizationId} invoice payment failed — PAST_DUE`, CONTEXT);
  }

  private async onInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
    const local = await this.findByInvoiceCustomer(invoice);
    if (!local || local.status === SubscriptionStatus.TRIALING) {
      return;
    }
    await this.repository.updateSubscription(local.id, {
      status: SubscriptionStatus.ACTIVE,
      pastDueSince: null,
    });
    await this.entitlements.invalidate(local.organizationId);
    // A paid invoice on a read-only org (dunning recovery/resubscribe) restores it.
    await this.lifecycle.restoreIfReadOnly(local.organizationId, 'invoice-paid');
  }

  // --- Helpers ---

  private findByInvoiceCustomer(invoice: Stripe.Invoice): Promise<Subscription | null> {
    const customerId = this.asId(invoice.customer);
    if (!customerId) {
      return Promise.resolve(null);
    }
    return this.repository.findSubscriptionByStripeCustomer(customerId);
  }

  private asId(value: string | { id: string } | null | undefined): string | null {
    if (!value) {
      return null;
    }
    return typeof value === 'string' ? value : value.id;
  }

  private periodEnd(subscription: Stripe.Subscription | null): Date | null {
    const end = subscription?.current_period_end;
    return end ? new Date(end * 1000) : null;
  }

  private periodStart(subscription: Stripe.Subscription | null): Date | null {
    const start = subscription?.current_period_start;
    return start ? new Date(start * 1000) : null;
  }

  private mapStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
    switch (status) {
      case 'active':
      case 'trialing':
        return SubscriptionStatus.ACTIVE;
      case 'past_due':
      case 'unpaid':
        return SubscriptionStatus.PAST_DUE;
      case 'canceled':
      case 'incomplete_expired':
        return SubscriptionStatus.CANCELED;
      case 'paused':
        return SubscriptionStatus.PAUSED;
      case 'incomplete':
        return SubscriptionStatus.PAST_DUE;
      default: {
        const exhaustive: never = status;
        throw new Error(`Unhandled Stripe status: ${String(exhaustive)}`);
      }
    }
  }
}
