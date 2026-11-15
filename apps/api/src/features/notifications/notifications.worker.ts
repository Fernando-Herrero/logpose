import { hostname } from 'node:os';

import {
  type BeforeApplicationShutdown,
  Injectable,
  Logger,
  type OnApplicationBootstrap,
} from '@nestjs/common';

import { NotificationEventsPersistence } from './notification-events.persistence.js';
import { NotificationsService } from './notifications.service.js';

/** Pausa entre el final de una pasada y el principio de la siguiente. */
const POLL_MS = 2_000;

@Injectable()
export class NotificationsWorker
  implements OnApplicationBootstrap, BeforeApplicationShutdown
{
  private readonly logger = new Logger(NotificationsWorker.name);
  private readonly lockedBy = `${hostname()}:${process.pid}`;
  private timer?: NodeJS.Timeout;
  private pass = Promise.resolve();
  private stopped = false;

  constructor(
    private readonly events: NotificationEventsPersistence,
    private readonly notifications: NotificationsService,
  ) {}

  onApplicationBootstrap() {
    this.schedule();
  }
  /** Deja de recoger y espera a que acabe la pasada en curso. */
  async beforeApplicationShutdown() {
    this.stopped = true;
    clearTimeout(this.timer);
    await this.pass;
  }

  /** Entrega todo lo que toca a la hora `now`; lo que falla vuelve a la cola con su espera. */
  async processPending(now: Date) {
    while (!this.stopped) {
      const event = await this.events.claimNext(now, this.lockedBy);
      if (!event) return;

      try {
        await this.notifications.deliver(event.notification);
        await this.events.complete(event._id);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await this.events.fail(event, message, now);
      }
    }
  }

  /** La pasada siguiente se programa al acabar la anterior: nunca hay dos a la vez. */
  private schedule() {
    this.timer = setTimeout(() => {
      this.pass = this.processPending(new Date())
        .catch((error: unknown) => this.logger.error(error))
        .then(() => {
          if (!this.stopped) this.schedule();
        });
    }, POLL_MS);
  }
}
