// Author: Robert Massey | Created: 2026-07-12 | Module: notifications
// Two channels: transactional email (EmailService, S0) and the in-app feed
// (InAppNotificationsService, S9). Global so any domain module can emit
// without an import edge — emitters are fire-and-forget by contract.

import { Global, Module } from '@nestjs/common';

import { EmailService } from './email.service';
import { InAppNotificationsService } from './in-app-notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsRepository } from './notifications.repository';

@Global()
@Module({
  controllers: [NotificationsController],
  providers: [EmailService, NotificationsRepository, InAppNotificationsService],
  exports: [EmailService, InAppNotificationsService],
})
export class NotificationsModule {}
