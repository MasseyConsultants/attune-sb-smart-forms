// Author: Robert Massey | Created: 2026-07-12 | Module: Billing
// Purpose: Authenticated billing endpoints. Checkout/portal are OWNER-only —
// billing is the owner's domain; usage is visible to any member.

import type {
  CheckoutSessionResponse,
  PortalSessionResponse,
  SubscriptionSummary,
  UsageSummary,
} from '@attune-sb/shared-types';
import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';

import { BillingService } from './billing.service';
import { CheckoutDto } from './dto/checkout.dto';

import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import type { AuthenticatedUser } from '@/modules/auth/strategies/jwt.strategy';
import { EntitlementsService } from '@/modules/entitlements/entitlements.service';

@ApiTags('Billing')
@Controller('billing')
export class BillingController {
  constructor(
    private readonly billingService: BillingService,
    private readonly entitlementsService: EntitlementsService,
  ) {}

  @Get('subscription')
  @ApiOperation({ summary: 'Current subscription summary (local state, never Stripe)' })
  subscription(@CurrentUser() user: AuthenticatedUser): Promise<SubscriptionSummary> {
    return this.billingService.getSubscriptionSummary(user.organizationId);
  }

  @Get('usage')
  @ApiOperation({ summary: 'Usage across all meters and counted resources' })
  usage(@CurrentUser() user: AuthenticatedUser): Promise<UsageSummary> {
    return this.entitlementsService.getUsageSummary(user.organizationId);
  }

  @Post('checkout')
  @Roles(Role.OWNER)
  @ApiOperation({ summary: 'Create a Stripe Checkout session (OWNER)' })
  checkout(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CheckoutDto,
  ): Promise<CheckoutSessionResponse> {
    return this.billingService.createCheckoutSession(
      user.organizationId,
      user.email,
      dto.planId,
      dto.interval,
    );
  }

  @Post('portal')
  @Roles(Role.OWNER)
  @ApiOperation({ summary: 'Create a Stripe Billing Portal session (OWNER)' })
  portal(@CurrentUser() user: AuthenticatedUser): Promise<PortalSessionResponse> {
    return this.billingService.createPortalSession(user.organizationId);
  }
}
