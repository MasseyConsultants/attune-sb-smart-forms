// Author: Robert Massey | Created: 2026-07-12 | Module: Seed
// Purpose: Idempotent development seed — plan rows (mirroring PLAN_ENTITLEMENTS),
// a demo org on an active trial, and the Attune platform admin.
// Run: pnpm db:seed (from repo root) or pnpm seed (from api/).

import { LIBRARY_CATEGORIES } from '@attune-sb/shared-types';
import {
  LibraryTemplateScope,
  Prisma,
  PrismaClient,
  Role,
  SubscriptionStatus,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';

import { LIBRARY_SEED_TEMPLATES } from './library-seed-data';

const prisma = new PrismaClient();

const TRIAL_LENGTH_DAYS = 14;

// Dev-only credentials — printed at the end of the seed run.
const PLATFORM_ADMIN_EMAIL = 'admin@attuneitus.com';
const PLATFORM_ADMIN_PASSWORD = 'AttunePlatform#2026';
const DEMO_OWNER_EMAIL = 'owner@demo.attune-sb.local';
const DEMO_OWNER_PASSWORD = 'DemoOwnerPass#2026';

// One org per paid tier so every plan's gates/limits can be tested without
// Stripe — the local Subscription row is the entitlement authority.
const TIER_ORGS = [
  {
    planId: 'solo',
    orgName: 'Solo Handyman LLC',
    slug: 'demo-solo-handyman',
    email: 'owner@solo.attune-sb.local',
    password: 'SoloOwnerPass#2026',
    firstName: 'Sam',
    lastName: 'Solo',
  },
  {
    planId: 'growth',
    orgName: 'Growth Dental Group',
    slug: 'demo-growth-dental',
    email: 'owner@growth.attune-sb.local',
    password: 'GrowthOwnerPass#2026',
    firstName: 'Grace',
    lastName: 'Growth',
  },
  {
    planId: 'business',
    orgName: 'Business Logistics Inc',
    slug: 'demo-business-logistics',
    email: 'owner@business.attune-sb.local',
    password: 'BizOwnerPass#2026',
    firstName: 'Blake',
    lastName: 'Business',
  },
] as const;

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

async function seedTierOrgs(): Promise<void> {
  for (const tier of TIER_ORGS) {
    const org = await prisma.organization.upsert({
      where: { slug: tier.slug },
      create: { name: tier.orgName, slug: tier.slug },
      update: {},
    });

    const passwordHash = await bcrypt.hash(tier.password, 12);
    await prisma.user.upsert({
      where: { email: tier.email },
      create: {
        email: tier.email,
        passwordHash,
        firstName: tier.firstName,
        lastName: tier.lastName,
        role: Role.OWNER,
        organizationId: org.id,
        emailVerified: true,
        acceptedTermsAt: new Date(),
      },
      update: {},
    });

    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const existing = await prisma.subscription.findUnique({
      where: { organizationId: org.id },
    });
    if (!existing) {
      await prisma.subscription.create({
        data: {
          organizationId: org.id,
          planId: tier.planId,
          status: SubscriptionStatus.ACTIVE,
          currentPeriodEnd: periodEnd,
          billingAnchorDay: now.getUTCDate(),
        },
      });
    }
  }
  console.warn(`Seeded ${TIER_ORGS.length} paid-tier demo orgs (solo/growth/business)`);
}

async function seedLibraryTemplates(): Promise<void> {
  // Upsert by stable slug: re-running refreshes curated content in place
  // without duplicating rows or resetting install counts.
  for (const template of LIBRARY_SEED_TEMPLATES) {
    if (!(LIBRARY_CATEGORIES as readonly string[]).includes(template.category)) {
      throw new Error(`Template ${template.slug} has unknown category "${template.category}"`);
    }
    const content = {
      name: template.name,
      description: template.description,
      category: template.category,
      scope: LibraryTemplateScope.PUBLIC,
      schema: template.schema as unknown as Prisma.InputJsonValue,
      workflow: template.workflow
        ? (template.workflow as unknown as Prisma.InputJsonValue)
        : Prisma.JsonNull,
      deletedAt: null,
    };
    await prisma.libraryTemplate.upsert({
      where: { slug: template.slug },
      create: { slug: template.slug, ...content },
      update: content,
    });
  }
  console.warn(`Seeded ${LIBRARY_SEED_TEMPLATES.length} library templates`);
}

async function main(): Promise<void> {
  await seedPlans();
  await seedPlatformAdmin();
  await seedDemoOrg();
  await seedTierOrgs();
  await seedLibraryTemplates();

  console.warn('');
  console.warn('=== Seed complete — dev credentials ===');
  console.warn(`Platform admin: ${PLATFORM_ADMIN_EMAIL} / ${PLATFORM_ADMIN_PASSWORD}`);
  console.warn(`Trial owner:    ${DEMO_OWNER_EMAIL} / ${DEMO_OWNER_PASSWORD}`);
  for (const tier of TIER_ORGS) {
    console.warn(`${tier.planId.padEnd(8)} owner: ${tier.email} / ${tier.password}`);
  }
  console.warn('=======================================');
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
