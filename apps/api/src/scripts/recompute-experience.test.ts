import { type Db, MongoClient } from 'mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { mongoClientOptions } from '../integrations/mongodb/mongodb.config.js';
import { recomputeExperience } from './recompute-experience.js';

let mongod: MongoMemoryServer;
let client: MongoClient;
let db: Db;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  client = await MongoClient.connect(mongod.getUri(), mongoClientOptions);
  db = client.db('test');
});

afterAll(async () => {
  await client.close();
  await mongod.stop();
});

describe('recomputeExperience', () => {
  // XP esperada sacada de episodes.json: el 1 da 125 y el 2 otros 100.
  it('rewrites only the stale experience and is idempotent', async () => {
    const users = db.collection('users');
    const { insertedIds } = await users.insertMany([
      { lastWatchedEpisode: 1, experience: 100 },
      { lastWatchedEpisode: 2, experience: 225 },
      { lastWatchedEpisode: 0, experience: 50 },
    ]);

    expect(await recomputeExperience(db)).toBe(2);
    expect(
      await users
        .find({}, { projection: { _id: 1, experience: 1 } })
        .sort({ lastWatchedEpisode: 1 })
        .toArray(),
    ).toEqual([
      { _id: insertedIds[2], experience: 0 },
      { _id: insertedIds[0], experience: 125 },
      { _id: insertedIds[1], experience: 225 },
    ]);

    expect(await recomputeExperience(db)).toBe(0);
  });
});
