import { DEFAULT_USER_PREFERENCES } from '@logpose/contracts/common/user.schemas';
import { MongoClient, ObjectId } from 'mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { mongoClientOptions } from '../../integrations/mongodb/mongodb.config.js';
import { UsersPersistence } from '../users/users.persistence.js';
import { ProgressService } from './progress.service.js';

let mongod: MongoMemoryServer;
let client: MongoClient;
let users: UsersPersistence;
let service: ProgressService;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  client = await MongoClient.connect(mongod.getUri(), mongoClientOptions);
  users = new UsersPersistence(client.db('test').collection('users'));
  await users.onModuleInit();
  service = new ProgressService(users);
});

afterAll(async () => {
  await client.close();
  await mongod.stop();
});

/** Usuario recién registrado, como lo crea `AuthService.register`. */
async function newUserId() {
  const username = `user-${new ObjectId().toHexString()}`;
  const user = await users.insert({
    username,
    firstName: 'Monkey',
    lastName: 'D.',
    email: `${username}@logpose.test`,
    password: 'hash',
    avatar: '/avatars/luffy/luffy-happy-400.webp',
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
  return user._id.toHexString();
}

const start = { lastWatchedEpisode: 0, experience: 0, level: 1, avatars: [] };

describe('ProgressService.set', () => {
  it('marcar el episodio 1 suma su XP y guarda el progreso', async () => {
    const id = await newUserId();

    const result = await service.set(id, 1);

    expect(result).toEqual({
      before: start,
      after: { lastWatchedEpisode: 1, experience: 125, level: 3, avatars: [] },
    });
    expect(await users.findById(id)).toMatchObject({
      lastWatchedEpisode: 1,
      experience: 125,
    });
  });

  it('desmarcar baja la XP a la de los episodios que quedan', async () => {
    const id = await newUserId();
    await service.set(id, 2);

    const result = await service.set(id, 1);

    expect(result.before).toMatchObject({
      lastWatchedEpisode: 2,
      experience: 225,
    });
    expect(result.after).toMatchObject({
      lastWatchedEpisode: 1,
      experience: 125,
    });
  });

  it('mandar el mismo episodio dos veces no da el doble', async () => {
    const id = await newUserId();
    await service.set(id, 1);

    const result = await service.set(id, 1);

    expect(result.before).toEqual(result.after);
    expect(await users.findById(id)).toMatchObject({ experience: 125 });
  });

  it('saltar al 500 calcula XP, nivel y avatares de una vez', async () => {
    const id = await newUserId();

    const { after } = await service.set(id, 500);

    expect(after).toEqual({
      lastWatchedEpisode: 500,
      experience: 63_505,
      level: 65,
      avatars: ['chopper', 'robin', 'brook', 'jimbe'],
    });
  });

  it('llegar al 81 desbloquea a Chopper', async () => {
    const id = await newUserId();
    await service.set(id, 80);

    const { before, after } = await service.set(id, 81);

    expect(before.avatars).toEqual(['robin']);
    expect(after.avatars).toEqual(['chopper', 'robin']);
  });

  it('0 reinicia el progreso', async () => {
    const id = await newUserId();
    await service.set(id, 500);

    const { after } = await service.set(id, 0);

    expect(after).toEqual(start);
    expect(await users.findById(id)).toMatchObject({
      lastWatchedEpisode: 0,
      experience: 0,
    });
  });

  it('un episodio que no existe falla sin tocar el progreso', async () => {
    const id = await newUserId();
    await service.set(id, 1);

    await expect(service.set(id, 1181)).rejects.toMatchObject({
      code: 'EPISODE_NOT_FOUND',
    });
    expect(await users.findById(id)).toMatchObject({
      lastWatchedEpisode: 1,
      experience: 125,
    });
  });

  it('un usuario que ya no existe da UNAUTHORIZED', async () => {
    await expect(
      service.set(new ObjectId().toHexString(), 1),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });
});
