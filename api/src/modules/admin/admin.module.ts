// Author: Robert Massey | Created: 2026-07-13 | Module: Admin

import { Module } from '@nestjs/common';

import { AdminController } from './admin.controller';
import { AdminRepository } from './admin.repository';
import { AdminService } from './admin.service';

import { EntitlementsModule } from '@/modules/entitlements/entitlements.module';

@Module({
  imports: [EntitlementsModule],
  controllers: [AdminController],
  providers: [AdminRepository, AdminService],
})
export class AdminModule {}
