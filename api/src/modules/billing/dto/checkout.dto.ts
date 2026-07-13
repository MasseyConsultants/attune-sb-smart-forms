// Author: Robert Massey | Created: 2026-07-12 | Module: Billing / DTO

import type { PaidPlanId } from '@attune-sb/shared-types';
import { IsIn } from 'class-validator';

import type { BillingInterval } from '../stripe-client.service';

export class CheckoutDto {
  @IsIn(['solo', 'growth', 'business'])
  planId!: PaidPlanId;

  @IsIn(['monthly', 'annual'])
  interval!: BillingInterval;
}
