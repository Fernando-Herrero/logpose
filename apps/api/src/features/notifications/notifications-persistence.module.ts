import { MongoModule } from '@jperezmart/nest-mongodb';
import { Module } from '@nestjs/common';

import { NotificationEventsPersistence } from './notification-events.persistence.js';
import { NotificationsPersistence } from './notifications.persistence.js';

@Module({
  imports: [MongoModule.forFeature(['notifications', 'notification_events'])],
  providers: [NotificationsPersistence, NotificationEventsPersistence],
  exports: [NotificationsPersistence, NotificationEventsPersistence],
})
export class NotificationsPersistenceModule {}
