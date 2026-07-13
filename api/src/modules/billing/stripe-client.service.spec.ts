// Author: Robert Massey | Created: 2026-07-12 | Module: Billing / Tests
// Acceptance pin: with NO Stripe keys configured the trial path must work and
// billing endpoints must fail fast with a clear BILLING_NOT_CONFIGURED (503).

import type { ConfigService } from '@nestjs/config';

import { BillingNotConfiguredException, StripeClientService } from './stripe-client.service';

function makeConfig(values: Record<string, string>): ConfigService {
  // Reason: structural mock — only .get() is exercised by StripeClientService.
  return { get: (key: string) => values[key] } as any;
}

describe('StripeClientService without Stripe keys', () => {
  const service = new StripeClientService(makeConfig({}));

  it('reports billing as not configured', () => {
    expect(service.isConfigured).toBe(false);
  });

  it('getClient throws BILLING_NOT_CONFIGURED with 503', () => {
    try {
      service.getClient();
      fail('expected BillingNotConfiguredException');
    } catch (err) {
      const exception = err as BillingNotConfiguredException;
      expect(exception.getStatus()).toBe(503);
      expect((exception.getResponse() as { error: string }).error).toBe('BILLING_NOT_CONFIGURED');
    }
  });

  it('webhookSecret and priceIdFor also fail fast', () => {
    expect(() => service.webhookSecret).toThrow(BillingNotConfiguredException);
    expect(() => service.priceIdFor('growth', 'monthly')).toThrow(BillingNotConfiguredException);
  });
});

describe('StripeClientService price catalog', () => {
  const service = new StripeClientService(
    makeConfig({
      STRIPE_SECRET_KEY: 'sk_test_x',
      STRIPE_PRICE_SOLO_MONTHLY: 'price_solo_m',
      STRIPE_PRICE_GROWTH_MONTHLY: 'price_growth_m',
      STRIPE_PRICE_GROWTH_ANNUAL: 'price_growth_a',
    }),
  );

  it('resolves plan+interval to the env price id', () => {
    expect(service.priceIdFor('growth', 'monthly')).toBe('price_growth_m');
    expect(service.priceIdFor('growth', 'annual')).toBe('price_growth_a');
  });

  it('reverse-lookups a price id to plan+interval', () => {
    expect(service.lookupPrice('price_growth_a')).toEqual({
      planId: 'growth',
      interval: 'annual',
    });
    expect(service.lookupPrice('price_unknown')).toBeNull();
  });

  it('throws for a plan whose price is not configured', () => {
    expect(() => service.priceIdFor('business', 'monthly')).toThrow(BillingNotConfiguredException);
  });
});
