// Author: Robert Massey | Created: 2026-07-12 | Module: Billing / Webhooks
// Purpose: Public Stripe webhook intake. Signature is verified on the RAW request
// body (S1 security rule) before any parsing; handlers are idempotent by event id.

import {
  BadRequestException,
  Controller,
  Headers,
  Post,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';

import { StripeWebhookService } from './stripe-webhook.service';

import { Public } from '@/modules/auth/decorators/public.decorator';

@ApiTags('Webhooks')
@Public()
@Controller('webhooks')
export class StripeWebhookController {
  constructor(private readonly webhookService: StripeWebhookService) {}

  @Post('stripe')
  @ApiOperation({ summary: 'Stripe webhook intake (signature-verified, idempotent)' })
  async handleStripe(
    @Req() request: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string | undefined,
  ): Promise<{ received: true; processed: boolean }> {
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }
    if (!request.rawBody) {
      throw new BadRequestException('Raw body unavailable — check body parser configuration');
    }

    const event = this.webhookService.verifyAndParse(request.rawBody, signature);
    const { processed } = await this.webhookService.handleEvent(event);
    return { received: true, processed };
  }
}
