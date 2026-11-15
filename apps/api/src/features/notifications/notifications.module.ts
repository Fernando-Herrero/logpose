import { Module } from '@nestjs/common';

import { UsersPersistenceModule } from '../users/users-persistence.module.js';
import { NotificationsService } from './notifications.service.js';
import { NotificationsPersistenceModule } from './notifications-persistence.module.js';

@Module({
  imports: [NotificationsPersistenceModule, UsersPersistenceModule],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
