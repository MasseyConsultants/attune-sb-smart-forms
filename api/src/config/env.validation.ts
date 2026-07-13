// Author: Robert Massey | Created: 2026-07-12 | Module: Config Validation
// Purpose: Joi schema validating all required environment variables at boot.
// A missing or malformed variable causes an immediate, descriptive startup failure.
// Ported from enterprise; SMB edition has a single deployment mode (multitenant SaaS)
// so DEPLOYMENT_MODE is gone, and storage is S3-compatible (ADR-005) — no Azure vars.

import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),

  APP_VERSION: Joi.string().default('0.1.0'),

  API_PORT: Joi.number().integer().min(1).max(65535).default(3101),

  // --- Database ---
  DATABASE_URL: Joi.string()
    .uri({ scheme: ['postgresql', 'postgres'] })
    .required(),

  // --- JWT ---
  JWT_SECRET: Joi.string().min(32).required(),
  // Separate secret so a leaked access secret cannot forge refresh tokens.
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_ACCESS_TTL: Joi.number().integer().positive().default(900), // 15 minutes
  JWT_REFRESH_TTL: Joi.number().integer().positive().default(604800), // 7 days

  // --- Bcrypt ---
  BCRYPT_ROUNDS: Joi.number().integer().min(10).max(15).default(12),

  // --- Redis ---
  REDIS_HOST: Joi.string().required(),
  REDIS_PORT: Joi.number().integer().min(1).max(65535).default(6379),
  REDIS_PASSWORD: Joi.string().optional().allow(''),

  // --- CORS ---
  CORS_ORIGINS: Joi.string().default('http://localhost:3100'),

  // --- Encryption (AES-256-GCM for stored third-party credentials) ---
  ENCRYPTION_KEY: Joi.string().length(64).required(),

  // --- URLs ---
  APP_URL: Joi.string().uri().default('http://localhost:3100'),
  API_PUBLIC_URL: Joi.string().uri().default('http://localhost:3101'),

  // --- Stripe (billing) ---
  // Optional in dev so the trial path works without Stripe keys. Checkout and
  // webhook endpoints return 503 BILLING_NOT_CONFIGURED when absent.
  STRIPE_SECRET_KEY: Joi.string().optional().allow(''),
  STRIPE_WEBHOOK_SECRET: Joi.string().optional().allow(''),
  STRIPE_PRICE_SOLO_MONTHLY: Joi.string().optional().allow(''),
  STRIPE_PRICE_SOLO_ANNUAL: Joi.string().optional().allow(''),
  STRIPE_PRICE_GROWTH_MONTHLY: Joi.string().optional().allow(''),
  STRIPE_PRICE_GROWTH_ANNUAL: Joi.string().optional().allow(''),
  STRIPE_PRICE_BUSINESS_MONTHLY: Joi.string().optional().allow(''),
  STRIPE_PRICE_BUSINESS_ANNUAL: Joi.string().optional().allow(''),

  // --- Email (Resend via SMTP preferred, generic SMTP fallback, console stub otherwise) ---
  EMAIL_PROVIDER: Joi.string().valid('resend', 'smtp').default('resend'),
  RESEND_API_KEY: Joi.string().optional().allow(''),
  // Bare address or the full '"Name <addr>"' form (enterprise convention)
  EMAIL_FROM: Joi.string().optional().allow('').default('noreply@attuneitus.com'),
  SMTP_HOST: Joi.string().optional().allow(''),
  SMTP_PORT: Joi.number().integer().min(1).max(65535).default(587),
  SMTP_SECURE: Joi.boolean().default(false),
  SMTP_USER: Joi.string().optional().allow(''),
  SMTP_PASS: Joi.string().optional().allow(''),

  // --- BFF trust boundary ---
  // Required in production so API routes cannot be hit without the web BFF key.
  INTERNAL_API_KEY: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.string().min(32).required(),
    otherwise: Joi.string().optional().allow(''),
  }),
});
