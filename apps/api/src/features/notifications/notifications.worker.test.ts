import 'reflect-metadata';

import { DEFAULT_USER_PREFERENCES } from '@logpose/contracts/common/user.schemas';
import { type Db, MongoClient, ObjectId } from 'mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { mongoClientOptions } from '../../integrations/mongodb/mongodb.config.js';
import type { UserDocument } from '../users/user.mappers.js';
import { UsersPersistence } from '../users/users.persistence.js';
import { NotificationEventsPersistence } from './notification-events.persistence.js';
import { NotificationsPersistence } from './notifications.persistence.js';
import { NotificationsService } from './notifications.service.js';
import { NotificationsWorker } from './notifications.worker.js';

/** Usuario completo como lo crea `AuthService.register`. */
const newUser = (username: string): Omit<UserDocument, '_id'> => ({
  username,
  firstName: 'Monkey',
  lastName: 'D.',
  email: `${username}@logpose.test`,
  password: 'hash',
  avatar: '/avatars/default.png',
  privacy: {
    showPosts: true,
    showLikes: true,
    showBookmarked: true,
    showComments: true,
  },
  preferences: DEFAULT_USER_PREFERENCES,
  role: 'user',
  verified: false,
  isActive: true,
  experience: 0,
  lastWatchedEpisode: 0,
  unlockedCards: {
    characters: [],
    items: [],
    fruits: [],
    swords: [],
    boats: [],
  },
  followers: [],
  following: [],
});

let mongod: MongoMemoryServer;
let client: MongoClient;
let db: Db;
let usersPersistence: UsersPersistence;
let notificationsService: NotificationsService;
let worker: NotificationsWorker;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  client = await MongoClient.connect(mongod.getUri(), mongoClientOptions);
  db = client.db('test');

  usersPersistence = new UsersPersistence(db.collection('users'));
  await usersPersistence.onModuleInit();
  const notificationsPersistence = new NotificationsPersistence(
    db.collection('notifications'),
  );
  await notificationsPersistence.onModuleInit();
  const eventsPersistence = new NotificationEventsPersistence(
    db.collection('notification_events'),
  );
  await eventsPersistence.onModuleInit();
  notificationsService = new NotificationsService(
    usersPersistence,
    notificationsPersistence,
    eventsPersistence,
  );
  worker = new NotificationsWorker(eventsPersistence, notificationsService);
});

afterAll(async () => {
  await client.close();
  await mongod.stop();
});

const create = async (username: string) =>
  (await usersPersistence.insert(newUser(username)))._id.toString();

const eventsFor = (to: string) =>
  db
    .collection('notification_events')
    .find({ 'notification.to': to })
    .toArray();

const notificationsTo = (to: string) =>
  db
    .collection('notifications')
    .find({ to: new ObjectId(to) })
    .toArray();

const secondsFromNow = (seconds: number) =>
  new Date(Date.now() + seconds * 1_000);

/** Hace fallar `notifications.insert` sin mocks: ningún documento cumple el validador. */
const failNotifications = () =>
  db.command({
    collMod: 'notifications',
    validator: { never: { $exists: true } },
  });
const restoreNotifications = () =>
  db.command({ collMod: 'notifications', validator: {} });

describe('NotificationsWorker.processPending', () => {
  it('dos eventos idénticos dejan una notificación y ningún evento', async () => {
    const from = await create('wk_dup_from');
    const to = await create('wk_dup_to');
    const postId = new ObjectId().toString();

    await notificationsService.notify({ type: 'like', to, from, postId });
    await notificationsService.notify({ type: 'like', to, from, postId });
    await worker.processPending(new Date());

    expect(await notificationsTo(to)).toHaveLength(1);
    expect(await eventsFor(to)).toHaveLength(0);
  });

  it('si crear la notificación falla, el evento sigue pending con attempts 1 y no se reintenta hasta 2 s después', async () => {
    const from = await create('wk_retry_from');
    const to = await create('wk_retry_to');
    await notificationsService.notify({ type: 'follow', to, from });

    await failNotifications();
    try {
      await worker.processPending(new Date());
      const [failed] = await eventsFor(to);
      expect(failed).toMatchObject({ status: 'pending', attempts: 1 });
      expect(failed!.lastError.message).toBeTruthy();

      // Aún no toca: sigue en attempts 1.
      await worker.processPending(secondsFromNow(1));
      expect((await eventsFor(to))[0]).toMatchObject({ attempts: 1 });
    } finally {
      await restoreNotifications();
    }

    await worker.processPending(secondsFromNow(2));

    expect(await notificationsTo(to)).toHaveLength(1);
    expect(await eventsFor(to)).toHaveLength(0);
  });

  it('las esperas entre intentos son 2, 4, 8, 16 y 32 s, y el sexto fallo deja el evento failed', async () => {
    const from = await create('wk_backoff_from');
    const to = await create('wk_backoff_to');
    await notificationsService.notify({ type: 'follow', to, from });

    await failNotifications();
    try {
      // Intento 1 ahora; los siguientes en cuanto vence cada espera.
      const waits = [0, 2, 4, 8, 16, 32];
      let clock = 0;
      for (const [index, wait] of waits.entries()) {
        clock += wait;
        if (index > 0) {
          // Un segundo antes de que venza la espera, no se toca.
          await worker.processPending(secondsFromNow(clock - 1));
          expect((await eventsFor(to))[0]).toMatchObject({ attempts: index });
        }
        await worker.processPending(secondsFromNow(clock));
        expect((await eventsFor(to))[0]).toMatchObject({ attempts: index + 1 });
      }

      const [event] = await eventsFor(to);
      expect(event).toMatchObject({ status: 'failed', attempts: 6 });
      expect(event!.lastError.message).toBeTruthy();

      await worker.processPending(secondsFromNow(1_000));
      expect((await eventsFor(to))[0]).toMatchObject({ attempts: 6 });
    } finally {
      await restoreNotifications();
    }

    await worker.processPending(secondsFromNow(1_000));
    expect(await notificationsTo(to)).toHaveLength(0);
  });

  it('dos pasadas a la vez no duplican nada', async () => {
    const from = await create('wk_conc_from');
    const to = await create('wk_conc_to');
    const post1 = new ObjectId().toString();
    const post2 = new ObjectId().toString();
    await notificationsService.notify({
      type: 'like',
      to,
      from,
      postId: post1,
    });
    await notificationsService.notify({
      type: 'like',
      to,
      from,
      postId: post2,
    });
    await notificationsService.notify({ type: 'follow', to, from });

    await Promise.all([
      worker.processPending(new Date()),
      worker.processPending(new Date()),
    ]);

    expect(await notificationsTo(to)).toHaveLength(3);
    expect(await eventsFor(to)).toHaveLength(0);
  });

  it('un evento bloqueado hasta dentro de 30 s no se coge antes y sí después', async () => {
    const from = await create('wk_lock_from');
    const to = await create('wk_lock_to');
    await db.collection('notification_events').insertOne({
      notification: { type: 'follow', to, from },
      status: 'pending',
      attempts: 0,
      availableAt: secondsFromNow(30),
      lockedBy: 'otro-host:1',
      createdAt: new Date(),
    });

    await worker.processPending(secondsFromNow(29));
    expect(await eventsFor(to)).toHaveLength(1);
    expect(await notificationsTo(to)).toHaveLength(0);

    await worker.processPending(secondsFromNow(31));
    expect(await eventsFor(to)).toHaveLength(0);
    expect(await notificationsTo(to)).toHaveLength(1);
  });

  it('un evento cuyo destinatario no existe se descarta sin notificación ni failed', async () => {
    const from = await create('wk_ghost_from');
    const to = new ObjectId().toString();
    await notificationsService.notify({ type: 'follow', to, from });

    await worker.processPending(new Date());

    expect(await eventsFor(to)).toHaveLength(0);
    expect(await notificationsTo(to)).toHaveLength(0);
    await expect(
      db
        .collection('notification_events')
        .countDocuments({ 'notification.to': to, status: 'failed' }),
    ).resolves.toBe(0);
  });
});
