import { InjectCollection } from '@jperezmart/nest-mongodb';
import { Injectable, type OnModuleInit } from '@nestjs/common';
import { type ClientSession, type Collection, ObjectId } from 'mongodb';

import type { NewNotification } from './notifications.persistence.js';

/** Tiempo que un evento cogido es de su worker; si el worker cae, otro lo coge al vencer. */
const LOCK_MS = 30_000;
/** Reintentos tras el primer intento, con esperas de 2, 4, 8, 16 y 32 s. */
const MAX_RETRIES = 5;

export type NotificationEventDocument = {
  _id: ObjectId;
  notification: NewNotification;
  status: 'pending' | 'failed';
  attempts: number;
  /** Desde cuándo se puede coger: hace de bloqueo mientras se procesa y de espera tras un fallo. */
  availableAt: Date;
  lockedBy?: string;
  lastError?: { message: string; at: Date };
  createdAt: Date;
};

@Injectable()
export class NotificationEventsPersistence implements OnModuleInit {
  constructor(
    @InjectCollection('notification_events')
    private readonly events: Collection<NotificationEventDocument>,
  ) {}

  async onModuleInit() {
    await this.events.createIndexes([{ key: { status: 1, availableAt: 1 } }]);
  }

  async enqueue(notification: NewNotification, session: ClientSession) {
    const now = new Date();
    await this.events.insertOne(
      {
        _id: new ObjectId(),
        notification,
        status: 'pending',
        attempts: 0,
        availableAt: now,
        createdAt: now,
      },
      { session },
    );
  }

  /** Coge el siguiente evento que toca y lo bloquea en la misma operación: dos workers nunca reciben el mismo. */
  claimNext(now: Date, lockedBy: string) {
    return this.events.findOneAndUpdate(
      { status: 'pending', availableAt: { $lte: now } },
      { $set: { availableAt: new Date(now.getTime() + LOCK_MS), lockedBy } },
      { sort: { availableAt: 1 } },
    );
  }

  // `complete` y `fail` solo tocan el evento si `lockedBy` aún lo tiene: si su bloqueo venció
  // y lo cogió otro worker, el resultado es de ese otro.
  async complete(id: ObjectId, lockedBy: string) {
    await this.events.deleteOne({ _id: id, lockedBy });
  }

  /** Vuelve a la cola tras 2^intentos s, o queda `failed` si ya no quedan reintentos. */
  async fail(
    event: NotificationEventDocument,
    lockedBy: string,
    message: string,
    now: Date,
  ) {
    const attempts = event.attempts + 1;
    await this.events.updateOne(
      { _id: event._id, lockedBy },
      {
        $set: {
          attempts,
          status: attempts > MAX_RETRIES ? 'failed' : 'pending',
          availableAt: new Date(now.getTime() + 2 ** attempts * 1000),
          lastError: { message, at: now },
        },
        $unset: { lockedBy: '' },
      },
    );
  }

  async deleteByUser(userId: string, session: ClientSession) {
    await this.events.deleteMany(
      {
        $or: [{ 'notification.to': userId }, { 'notification.from': userId }],
      },
      { session },
    );
  }
}
