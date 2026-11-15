import { Injectable } from '@nestjs/common';

import {
  type UserPreferences,
  withPreferenceDefaults,
} from '../users/user.mappers.js';
import { UsersPersistence } from '../users/users.persistence.js';
import {
  type NewNotification,
  NotificationsPersistence,
  type NotificationType,
} from './notifications.persistence.js';

/** Interruptor de `preferences.notifications` que apaga cada tipo. */
const PREFERENCE_BY_TYPE: Record<
  NotificationType,
  keyof UserPreferences['notifications']
> = {
  like: 'likes',
  bookmark: 'bookmarks',
  comment: 'comments',
  follow: 'follows',
};

@Injectable()
export class NotificationsService {
  constructor(
    private readonly usersPersistence: UsersPersistence,
    private readonly notificationsPersistence: NotificationsPersistence,
  ) {}

  /** Crea la notificación salvo que sea para uno mismo o el destinatario tenga su tipo apagado. */
  async notify(notification: NewNotification) {
    if (notification.to === notification.from) return;

    const recipient = await this.usersPersistence.findById(notification.to);
    // Cuenta borrada entre medias: no hay a quién avisar.
    if (!recipient) return;

    const { notifications } = withPreferenceDefaults(recipient.preferences);
    if (notifications[PREFERENCE_BY_TYPE[notification.type]]) {
      await this.notificationsPersistence.create(notification);
    }
  }
}
