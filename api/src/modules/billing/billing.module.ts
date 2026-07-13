// Author: Robert Massey | Created: 2026-07-12 | Module: Billing

import { Module } from '@nestjs/common';

import { BillingController } from './billing.controller';
import { BillingRepository } from './billing.repository';
import { BillingService } from './billing.service';
import { StripeClientService } from './stripe-client.service';
import { StripeWebhookController } from './stripe-webhook.controller';
import { StripeWebhookService } from './stripe-webhook.service';

@Module({
  controllers: [BillingController, StripeWebhookController],
  providers: [BillingRepository, BillingService, StripeClientService, StripeWebhookService],
  exports: [BillingService],
})
export class BillingModule {}
