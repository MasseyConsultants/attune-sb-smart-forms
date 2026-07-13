// Author: Robert Massey | Created: 2026-07-12 | Module: notifications
// Sprint 0 scope: transactional EmailService only. In-app notifications land in P5.

import { Global, Module } from '@nestjs/common';

import { EmailService } from './email.service';

@Global()
@Module({
  providers: [EmailService],
  exports: [EmailService],
})
export class NotificationsModule {}
