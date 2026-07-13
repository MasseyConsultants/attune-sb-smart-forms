// Author: Robert Massey | Created: 2026-07-12 | Module: Entitlements
// Purpose: The ONLY Prisma access for the entitlement layer. Counter increments
// are atomic upserts; ledger writes are idempotent via the unique idempotency key.

import { Injectable } from '@nestjs/common';
import { Meter, Prisma, Subscription, EntitlementOverride, UsageCounter } from '@prisma/client';

import { PrismaService } from '@/modules/common/prisma/prisma.service';

export interface ConsumeWriteResult {
  /** False when the idempotency key was already recorded (no increment applied). */
  readonly applied: boolean;
  readonly counter: UsageCounter;
}

@Injectable()
export class EntitlementsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findSubscription(organizationId: string): Promise<Subscription | null> {
    return this.prisma.subscription.findUnique({ where: { organizationId } });
  }

  findActiveOverrides(organizationId: string, now: Date): Promise<EntitlementOverride[]> {
    return this.prisma.entitlementOverride.findMany({
      where: {
        organizationId,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
    });
  }

  findCounter(
    organizationId: string,
    meter: Meter,
    periodStart: Date,
  ): Promise<UsageCounter | null> {
    return this.prisma.usageCounter.findUnique({
      where: {
        organizationId_meter_periodStart: { organizationId, meter, periodStart },
      },
    });
  }

  /**
   * Ledger-first consumption inside one transaction:
   * 1. INSERT UsageEvent — a unique-key collision means this consumption was
   *    already applied, so the counter is returned untouched.
   * 2. Upsert the period counter with an atomic increment.
   */
  writeConsumption(params: {
    organizationId: string;
    meter: Meter;
    quantity: number;
    idempotencyKey: string;
    periodStart: Date;
    periodEnd: Date;
    refType?: string;
    refId?: string;
  }): Promise<ConsumeWriteResult> {
    const { organizationId, meter, quantity, idempotencyKey, periodStart, periodEnd } = params;

    return this.prisma.$transaction(async (tx) => {
      try {
        await tx.usageEvent.create({
          data: {
            organizationId,
            meter,
            quantity: BigInt(quantity),
            idempotencyKey,
            refType: params.refType,
            refId: params.refId,
          },
        });
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          const existing = await tx.usageCounter.upsert({
            where: { organizationId_meter_periodStart: { organizationId, meter, periodStart } },
            create: { organizationId, meter, periodStart, periodEnd, used: 0 },
            update: {},
          });
          return { applied: false, counter: existing };
        }
        throw err;
      }

      const counter = await tx.usageCounter.upsert({
        where: { organizationId_meter_periodStart: { organizationId, meter, periodStart } },
        create: { organizationId, meter, periodStart, periodEnd, used: BigInt(quantity) },
        update: { used: { increment: BigInt(quantity) } },
      });
      return { applied: true, counter };
    });
  }

  markSoftWarned(counterId: string, at: Date): Promise<UsageCounter> {
    return this.prisma.usageCounter.update({
      where: { id: counterId },
      data: { softWarnedAt: at },
    });
  }

  countActiveUsers(organizationId: string): Promise<number> {
    return this.prisma.user.count({
      where: { organizationId, isActive: true, deletedAt: null },
    });
  }
}
