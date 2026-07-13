// Author: Robert Massey | Created: 2026-07-12 | Module: Seed
// Purpose: Idempotent development seed — plan rows (mirroring PLAN_ENTITLEMENTS),
// a demo org on an active trial, and the Attune platform admin.
// Run: pnpm db:seed (from repo root) or pnpm seed (from api/).

import { PrismaClient, Role, SubscriptionStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const TRIAL_LENGTH_DAYS = 14;

// Dev-only credentials — printed at the end of the seed run.
const PLATFORM_ADMIN_EMAIL = 'admin@attuneitus.com';
const PLATFORM_ADMIN_PASSWORD = 'AttunePlatform#2026';
const DEMO_OWNER_EMAIL = 'owner@demo.attune-sb.local';
const DEMO_OWNER_PASSWORD = 'DemoOwnerPass#2026';

async function seedPlans(): Promise<void> {
  // Paid plans only — 'trial' is a subscription state, not a purchasable plan.
  const plans = [
    { id: 'solo', displayName: 'Solo' },
    { id: 'growth', displayName: 'Growth' },
    { id: 'business', displayName: 'Business' },
  ];

  for (const plan of plans) {
    const envPrefix = `STRIPE_PRICE_${plan.id.toUpperCase()}`;
    await prisma.plan.upsert({
      where: { id: plan.id },
      create: {
        id: plan.id,
        displayName: plan.displayName,
        stripePriceIdMonthly: process.env[`${envPrefix}_MONTHLY`] ?? '',
        stripePriceIdAnnual: process.env[`${envPrefix}_ANNUAL`] ?? '',
      },
      update: {
        displayName: plan.displayName,
        stripePriceIdMonthly: process.env[`${envPrefix}_MONTHLY`] ?? '',
        stripePriceIdAnnual: process.env[`${envPrefix}_ANNUAL`] ?? '',
      },
    });
  }
  console.warn(`Seeded ${plans.length} plans`);
}

async function seedPlatformAdmin(): Promise<void> {
  // Platform staff live in a dedicated internal org that is never metered or purged.
  const platformOrg = await prisma.organization.upsert({
    where: { slug: 'attune-platform' },
    create: {
      name: 'Attune IT (Platform)',
      slug: 'attune-platform',
      legalHoldAt: new Date(), // blocks any accidental purge of the platform org
    },
    update: {},
  });

  const passwordHash = await bcrypt.hash(PLATFORM_ADMIN_PASSWORD, 12);
  await prisma.user.upsert({
    where: { email: PLATFORM_ADMIN_EMAIL },
    create: {
      email: PLATFORM_ADMIN_EMAIL,
      passwordHash,
      firstName: 'Platform',
      lastName: 'Admin',
      role: Role.PLATFORM_ADMIN,
      organizationId: platformOrg.id,
      emailVerified: true,
      acceptedTermsAt: new Date(),
    },
    update: {},
  });
  console.warn('Seeded platform admin');
}

async function seedDemoOrg(): Promise<void> {
  const demoOrg = await prisma.organization.upsert({
    where: { slug: 'demo-plumbing-co' },
    create: {
      name: 'Demo Plumbing Co',
      slug: 'demo-plumbing-co',
    },
    update: {},
  });

  const passwordHash = await bcrypt.hash(DEMO_OWNER_PASSWORD, 12);
  await prisma.user.upsert({
    where: { email: DEMO_OWNER_EMAIL },
    create: {
      email: DEMO_OWNER_EMAIL,
      passwordHash,
      firstName: 'Dana',
      lastName: 'Demo',
      role: Role.OWNER,
      organizationId: demoOrg.id,
      emailVerified: true,
      acceptedTermsAt: new Date(),
    },
    update: {},
  });

  const now = new Date();
  const trialEndsAt = new Date(now.getTime() + TRIAL_LENGTH_DAYS * 24 * 60 * 60 * 1000);
  const existing = await prisma.subscription.findUnique({
    where: { organizationId: demoOrg.id },
  });
  if (!existing) {
    await prisma.subscription.create({
      data: {
        organizationId: demoOrg.id,
        planId: 'trial',
        status: SubscriptionStatus.TRIALING,
        trialEndsAt,
        billingAnchorDay: now.getUTCDate(),
        seats: 2,
      },
    });
  }
  console.warn('Seeded demo org with active trial');
}

async function main(): Promise<void> {
  await seedPlans();
  await seedPlatformAdmin();
  await seedDemoOrg();

  console.warn('');
  console.warn('=== Seed complete — dev credentials ===');
  console.warn(`Platform admin: ${PLATFORM_ADMIN_EMAIL} / ${PLATFORM_ADMIN_PASSWORD}`);
  console.warn(`Demo org owner: ${DEMO_OWNER_EMAIL} / ${DEMO_OWNER_PASSWORD}`);
  console.warn('=======================================');
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
