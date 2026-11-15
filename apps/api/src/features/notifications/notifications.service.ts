import { Injectable } from '@nestjs/common';
import type { ClientSession } from 'mongodb';

import {
  type UserPreferences,
  withPreferenceDefaults,
} from '../users/user.mappers.js';
import { UsersPersistence } from '../users/users.persistence.js';
import { NotificationEventsPersistence } from './notification-events.persistence.js';
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
  retweet: 'retweets',
};

@Injectable()
export class NotificationsService {
  constructor(
    private readonly usersPersistence: UsersPersistence,
    private readonly notificationsPersistence: NotificationsPersistence,
    private readonly eventsPersistence: NotificationEventsPersistence,
  ) {}

  /** Deja el aviso en la cola, en la transacción de la acción que lo origina; el worker lo entrega con `deliver`. */
  async notify(notification: NewNotification, session: ClientSession) {
    await this.eventsPersistence.enqueue(notification, session);
  }

  /** Crea la notificación salvo que sea para uno mismo o el destinatario tenga su tipo apagado. */
  async deliver(notification: NewNotification) {
    if (notification.to === notification.from) return;

    const [recipient, sender] = await Promise.all([
      this.usersPersistence.findById(notification.to),
      this.usersPersistence.findById(notification.from),
    ]);
    // Cuenta borrada entre medias: no hay a quién avisar ni de parte de quién.
    // Queda una ventana entre esta lectura y el insert; quien lea las notificaciones tolera un remitente ausente.
    if (!recipient || !sender) return;

    const { notifications } = withPreferenceDefaults(recipient.preferences);
    if (notifications[PREFERENCE_BY_TYPE[notification.type]]) {
      await this.notificationsPersistence.create(notification);
    }
  }

  /** Notificaciones y eventos pendientes de la cuenta, dentro de la transacción de su borrado. */
  async deleteByUser(userId: string, session: ClientSession) {
    await this.notificationsPersistence.deleteByUser(userId, session);
    await this.eventsPersistence.deleteByUser(userId, session);
  }
}
