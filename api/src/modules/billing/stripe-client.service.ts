// Author: Robert Massey | Created: 2026-07-12 | Module: Billing / Stripe Client
// Purpose: Lazily-constructed Stripe SDK + env price-id catalog. Everything is
// optional at boot: with no keys configured the trial path works end-to-end and
// billing endpoints fail fast with BILLING_NOT_CONFIGURED (503).

import type { PaidPlanId } from '@attune-sb/shared-types';
import { HttpException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

export type BillingInterval = 'monthly' | 'annual';

export interface PriceLookup {
  readonly planId: PaidPlanId;
  readonly interval: BillingInterval;
}

export class BillingNotConfiguredException extends HttpException {
  constructor() {
    super(
      {
        message: 'Billing is not configured on this environment',
        error: 'BILLING_NOT_CONFIGURED',
      },
      503,
    );
  }
}

@Injectable()
export class StripeClientService {
  private client: Stripe | null = null;

  constructor(private readonly config: ConfigService) {}

  get isConfigured(): boolean {
    return Boolean(this.config.get<string>('STRIPE_SECRET_KEY'));
  }

  get webhookSecret(): string {
    const secret = this.config.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!secret) {
      throw new BillingNotConfiguredException();
    }
    return secret;
  }

  getClient(): Stripe {
    const key = this.config.get<string>('STRIPE_SECRET_KEY');
    if (!key) {
      throw new BillingNotConfiguredException();
    }
    if (!this.client) {
      this.client = new Stripe(key);
    }
    return this.client;
  }

  priceIdFor(planId: PaidPlanId, interval: BillingInterval): string {
    const envKey = `STRIPE_PRICE_${planId.toUpperCase()}_${interval.toUpperCase()}`;
    const priceId = this.config.get<string>(envKey);
    if (!priceId) {
      throw new BillingNotConfiguredException();
    }
    return priceId;
  }

  /** Reverse lookup: Stripe price id → plan + interval. Null for unknown prices. */
  lookupPrice(priceId: string): PriceLookup | null {
    const planIds: PaidPlanId[] = ['solo', 'growth', 'business'];
    const intervals: BillingInterval[] = ['monthly', 'annual'];
    for (const planId of planIds) {
      for (const interval of intervals) {
        const envKey = `STRIPE_PRICE_${planId.toUpperCase()}_${interval.toUpperCase()}`;
        if (this.config.get<string>(envKey) === priceId) {
          return { planId, interval };
        }
      }
    }
    return null;
  }
}
