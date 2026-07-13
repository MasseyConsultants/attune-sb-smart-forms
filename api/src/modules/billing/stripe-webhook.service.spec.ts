// Author: Robert Massey | Created: 2026-07-12 | Module: Billing / Tests
// Webhook handlers with recorded-style fixtures + idempotency replays.
// Every handler must only mutate the local Subscription row and invalidate
// the entitlement cache — Stripe is never the entitlement authority.

import { SubscriptionStatus } from '@prisma/client';
import type Stripe from 'stripe';

import { StripeWebhookService } from './stripe-webhook.service';

const repository = {
  findSubscription: jest.fn(),
  findSubscriptionByStripeCustomer: jest.fn(),
  findSubscriptionByStripeSubscription: jest.fn(),
  updateSubscription: jest.fn(),
  recordWebhookEvent: jest.fn(),
  attachPaymentFingerprint: jest.fn(),
};

const stripeSubscriptionFixture = {
  id: 'sub_123',
  status: 'active',
  cancel_at_period_end: false,
  current_period_start: Date.UTC(2026, 6, 12) / 1000,
  current_period_end: Date.UTC(2026, 7, 12) / 1000,
  items: { data: [{ price: { id: 'price_growth_monthly' } }] },
  default_payment_method: { card: { fingerprint: 'fp_abc' } },
};

const stripeClient = {
  subscriptions: { retrieve: jest.fn().mockResolvedValue(stripeSubscriptionFixture) },
  webhooks: { constructEvent: jest.fn() },
};

const stripe = {
  getClient: jest.fn(() => stripeClient),
  lookupPrice: jest.fn(),
  webhookSecret: 'whsec_test',
};

const entitlements = { invalidate: jest.fn() };
const lifecycle = { restoreIfReadOnly: jest.fn().mockResolvedValue(false) };
const logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };

const LOCAL_SUB = {
  id: 'local-sub-1',
  organizationId: 'org-1',
  planId: 'trial',
  status: SubscriptionStatus.TRIALING,
  billingAnchorDay: 3,
  pastDueSince: null,
};

function makeService(): StripeWebhookService {
  // Reason: structural mocks stand in for Nest providers in unit tests.
  return new StripeWebhookService(
    repository as any,
    stripe as any,
    entitlements as any,
    lifecycle as any,
    logger as any,
  );
}

function event(type: string, object: unknown, id = 'evt_1'): Stripe.Event {
  return { id, type, data: { object } } as Stripe.Event;
}

beforeEach(() => {
  jest.clearAllMocks();
  repository.recordWebhookEvent.mockResolvedValue(true);
  repository.updateSubscription.mockResolvedValue({});
  stripeClient.subscriptions.retrieve.mockResolvedValue(stripeSubscriptionFixture);
});

describe('StripeWebhookService idempotency', () => {
  const service = makeService();

  it('skips a replayed event id without touching the subscription', async () => {
    repository.recordWebhookEvent.mockResolvedValue(false);
    const result = await service.handleEvent(
      event('customer.subscription.deleted', { id: 'sub_123' }),
    );
    expect(result.processed).toBe(false);
    expect(repository.updateSubscription).not.toHaveBeenCalled();
    expect(entitlements.invalidate).not.toHaveBeenCalled();
  });

  it('ignores unhandled event types after recording them', async () => {
    const result = await service.handleEvent(event('customer.created', {}));
    expect(result.processed).toBe(true);
    expect(repository.updateSubscription).not.toHaveBeenCalled();
  });
});

describe('checkout.session.completed', () => {
  const service = makeService();

  const session = {
    id: 'cs_1',
    subscription: 'sub_123',
    customer: 'cus_123',
    client_reference_id: 'org-1',
    metadata: { organizationId: 'org-1', planId: 'growth' },
  };

  it('converts the trial to the purchased plan with Stripe period anchoring', async () => {
    repository.findSubscription.mockResolvedValue(LOCAL_SUB);

    await service.handleEvent(event('checkout.session.completed', session));

    expect(repository.updateSubscription).toHaveBeenCalledWith(
      'local-sub-1',
      expect.objectContaining({
        planId: 'growth',
        status: SubscriptionStatus.ACTIVE,
        stripeCustomerId: 'cus_123',
        stripeSubscriptionId: 'sub_123',
        trialEndsAt: null,
        billingAnchorDay: 12, // period start day-of-month from the fixture
        pastDueSince: null,
      }),
    );
    expect(entitlements.invalidate).toHaveBeenCalledWith('org-1');
  });

  it('records the payment-method fingerprint hash for trial-abuse tracking', async () => {
    repository.findSubscription.mockResolvedValue(LOCAL_SUB);

    await service.handleEvent(event('checkout.session.completed', session));

    expect(repository.attachPaymentFingerprint).toHaveBeenCalledWith(
      'org-1',
      expect.stringMatching(/^[a-f0-9]{64}$/),
    );
  });

  it('is a safe no-op when org metadata is missing', async () => {
    await service.handleEvent(
      event('checkout.session.completed', { id: 'cs_2', metadata: {}, client_reference_id: null }),
    );
    expect(repository.updateSubscription).not.toHaveBeenCalled();
  });
});

describe('customer.subscription lifecycle events', () => {
  const service = makeService();

  it.each<[Stripe.Subscription.Status, SubscriptionStatus]>([
    ['active', SubscriptionStatus.ACTIVE],
    ['past_due', SubscriptionStatus.PAST_DUE],
    ['unpaid', SubscriptionStatus.PAST_DUE],
    ['canceled', SubscriptionStatus.CANCELED],
    ['paused', SubscriptionStatus.PAUSED],
  ])('subscription.updated maps Stripe %s → %s', async (stripeStatus, localStatus) => {
    repository.findSubscriptionByStripeSubscription.mockResolvedValue(LOCAL_SUB);
    stripe.lookupPrice.mockReturnValue({ planId: 'growth', interval: 'monthly' });

    await service.handleEvent(
      event('customer.subscription.updated', {
        ...stripeSubscriptionFixture,
        status: stripeStatus,
      }),
    );

    expect(repository.updateSubscription).toHaveBeenCalledWith(
      'local-sub-1',
      expect.objectContaining({ status: localStatus, planId: 'growth' }),
    );
    expect(entitlements.invalidate).toHaveBeenCalledWith('org-1');
  });

  it('subscription.updated keeps the local plan when the price is unknown', async () => {
    repository.findSubscriptionByStripeSubscription.mockResolvedValue(LOCAL_SUB);
    stripe.lookupPrice.mockReturnValue(null);

    await service.handleEvent(event('customer.subscription.updated', stripeSubscriptionFixture));

    const update = repository.updateSubscription.mock.calls[0][1];
    expect(update.planId).toBeUndefined();
  });

  it('subscription.deleted cancels the local subscription', async () => {
    repository.findSubscriptionByStripeSubscription.mockResolvedValue(LOCAL_SUB);

    await service.handleEvent(event('customer.subscription.deleted', { id: 'sub_123' }));

    expect(repository.updateSubscription).toHaveBeenCalledWith(
      'local-sub-1',
      expect.objectContaining({ status: SubscriptionStatus.CANCELED }),
    );
  });
});

describe('invoice events (dunning)', () => {
  const service = makeService();

  it('payment_failed marks PAST_DUE and starts the dunning clock', async () => {
    repository.findSubscriptionByStripeCustomer.mockResolvedValue(LOCAL_SUB);

    await service.handleEvent(event('invoice.payment_failed', { customer: 'cus_123' }));

    expect(repository.updateSubscription).toHaveBeenCalledWith(
      'local-sub-1',
      expect.objectContaining({
        status: SubscriptionStatus.PAST_DUE,
        pastDueSince: expect.any(Date),
      }),
    );
  });

  it('a second payment_failed keeps the original dunning start', async () => {
    const firstFailure = new Date('2026-07-01T00:00:00Z');
    repository.findSubscriptionByStripeCustomer.mockResolvedValue({
      ...LOCAL_SUB,
      pastDueSince: firstFailure,
    });

    await service.handleEvent(event('invoice.payment_failed', { customer: 'cus_123' }));

    expect(repository.updateSubscription).toHaveBeenCalledWith(
      'local-sub-1',
      expect.objectContaining({ pastDueSince: firstFailure }),
    );
  });

  it('invoice.paid restores ACTIVE and clears the dunning clock', async () => {
    repository.findSubscriptionByStripeCustomer.mockResolvedValue({
      ...LOCAL_SUB,
      status: SubscriptionStatus.PAST_DUE,
      pastDueSince: new Date(),
    });

    await service.handleEvent(event('invoice.paid', { customer: 'cus_123' }));

    expect(repository.updateSubscription).toHaveBeenCalledWith(
      'local-sub-1',
      expect.objectContaining({ status: SubscriptionStatus.ACTIVE, pastDueSince: null }),
    );
  });

  it('invoice.paid during trial is ignored (no paid sub to restore)', async () => {
    repository.findSubscriptionByStripeCustomer.mockResolvedValue(LOCAL_SUB); // TRIALING

    await service.handleEvent(event('invoice.paid', { customer: 'cus_123' }));

    expect(repository.updateSubscription).not.toHaveBeenCalled();
  });
});
