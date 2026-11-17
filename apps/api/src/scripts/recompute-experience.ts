import { type Db, MongoClient } from 'mongodb';
import * as z from 'zod/v4';

import { experienceUpTo } from '../features/serie/serie-data.js';
import type { UserDocument } from '../features/users/user.mappers.js';
import { mongoClientOptions } from '../integrations/mongodb/mongodb.config.js';

/** Reescribe la XP guardada con la regla actual (ADR 0021) y devuelve cuántos usuarios cambian. */
export async function recomputeExperience(db: Db) {
  const users = db.collection<UserDocument>('users');
  const stored = await users
    .find({}, { projection: { lastWatchedEpisode: 1, experience: 1 } })
    .toArray();

  const updates = stored.flatMap(({ _id, lastWatchedEpisode, experience }) => {
    const recomputed = experienceUpTo(lastWatchedEpisode);
    return recomputed === experience
      ? []
      : [
          {
            updateOne: {
              filter: { _id },
              update: { $set: { experience: recomputed } },
            },
          },
        ];
  });

  // bulkWrite lanza error con la lista vacía.
  if (updates.length > 0) {
    await users.bulkWrite(updates);
  }
  return updates.length;
}

if (import.meta.main) {
  // Solo las variables de Mongo: validateEnv es la del servidor y pediría también PORT.
  const env = z
    .object({
      MONGODB_URI: z.string().min(1),
      MONGODB_DBNAME: z.string().min(1),
    })
    .parse(process.env);
  const client = await MongoClient.connect(env.MONGODB_URI, mongoClientOptions);
  try {
    const updated = await recomputeExperience(client.db(env.MONGODB_DBNAME));
    process.stdout.write(`XP recalculada: ${updated} usuarios cambian.\n`);
  } finally {
    await client.close();
  }
}
