import { Module } from '@nestjs/common';

import { CoreModule } from '../../core.module.js';
import { NotificationsModule } from './notifications.module.js';
import { NotificationsWorker } from './notifications.worker.js';
import { NotificationsPersistenceModule } from './notifications-persistence.module.js';

@Module({
  imports: [CoreModule, NotificationsModule, NotificationsPersistenceModule],
  providers: [NotificationsWorker],
})
export class NotificationsWorkerModule {}
