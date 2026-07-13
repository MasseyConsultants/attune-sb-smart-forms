// Author: Robert Massey | Created: 2026-07-12 | Module: Common/Prisma
// Purpose: Wraps PrismaClient so NestJS can manage its lifecycle.
// Ported verbatim from the enterprise edition.

import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
