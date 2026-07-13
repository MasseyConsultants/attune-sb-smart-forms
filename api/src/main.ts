// Author: Robert Massey | Created: 2026-07-12 | Module: API Entry Point
// Purpose: NestJS application bootstrap — global middleware, pipes, interceptor, docs.
// Ported from enterprise. rawBody is preserved so the Stripe webhook controller can
// verify signatures on the raw request buffer before JSON parsing (S1).
// Swagger is gated behind NODE_ENV !== 'production'.

import type { IncomingMessage } from 'http';

import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as bodyParser from 'body-parser';
import helmet from 'helmet';

import { AppModule } from './app.module';
import { TransformInterceptor } from './modules/common/interceptors/transform.interceptor';
import { SecureLoggerService } from './modules/common/logger/secure-logger.service';

async function bootstrap(): Promise<void> {
  const logger = new SecureLoggerService('Bootstrap');
  const app = await NestFactory.create(AppModule, { logger, rawBody: true });

  // 10 MB body limit: public form submissions can carry base64 signatures/photos.
  // Registered AFTER NestFactory.create so they override the 100 kb defaults.
  // The verify hook captures the raw buffer so the Stripe webhook controller can
  // verify signatures (this parser runs before Nest's built-in rawBody parser).
  app.use(
    bodyParser.json({
      limit: '10mb',
      verify: (req: IncomingMessage & { rawBody?: Buffer }, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );
  app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

  const config = app.get(ConfigService);
  const port = config.get<number>('API_PORT', 3001);
  const nodeEnv = config.get<string>('NODE_ENV', 'development');
  const isDev = nodeEnv !== 'production';

  // --- Security headers ---
  // CSP disabled in dev so Swagger UI loads correctly.
  app.use(
    helmet({
      contentSecurityPolicy: isDev ? false : undefined,
      hsts: !isDev,
    }),
  );

  // --- CORS ---
  const rawOrigins = config.get<string>('CORS_ORIGINS', 'http://localhost:3000');
  const allowedOrigins = rawOrigins.split(',').map((o) => o.trim());

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id'],
  });

  // --- Global prefix ---
  app.setGlobalPrefix('api/v1');

  // --- Global ValidationPipe ---
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  // --- Global response transform ---
  // Filters are registered via APP_FILTER in app.module.ts.
  app.useGlobalInterceptors(new TransformInterceptor());

  // --- Swagger (dev only) ---
  if (isDev) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('attune-sb-smart-forms API')
      .setDescription('REST API for the attune-sb-smart-forms platform')
      .setVersion(config.get<string>('APP_VERSION', '0.1.0'))
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' })
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
    logger.log(`Swagger UI available at http://localhost:${port}/api/docs`);
  }

  app.enableShutdownHooks();

  await app.listen(port);
  logger.log(`API running on port ${port} [${nodeEnv}]`);
}

void bootstrap();
