import { InjectCollection } from '@jperezmart/nest-mongodb';
import { Injectable, type OnModuleInit } from '@nestjs/common';
import {
  type ClientSession,
  type Collection,
  ObjectId,
  type WithId,
} from 'mongodb';

import type { UserDocument, UserPreferences } from './user.mappers.js';

@Injectable()
export class UsersPersistence implements OnModuleInit {
  constructor(
    @InjectCollection('users')
    private readonly users: Collection<UserDocument>,
  ) {}

  async onModuleInit() {
    await this.users.createIndex({ username: 1 }, { unique: true });
    await this.users.createIndex({ email: 1 }, { unique: true });
  }

  async findById(id: string): Promise<WithId<UserDocument> | null> {
    return this.users.findOne({ _id: new ObjectId(id) });
  }

  async findByEmail(
    email: string,
    withPassword = false,
  ): Promise<WithId<UserDocument> | null> {
    return this.users.findOne(
      { email: email.toLowerCase() },
      withPassword ? undefined : { projection: { password: 0 } },
    );
  }

  findAccessById(id: string) {
    return this.users.findOne<Pick<UserDocument, 'role' | 'isActive'>>(
      { _id: new ObjectId(id) },
      { projection: { role: 1, isActive: 1 } },
    );
  }

  async findFollowingIds(id: string): Promise<ObjectId[]> {
    const doc = await this.users.findOne(
      { _id: new ObjectId(id) },
      { projection: { following: 1 } },
    );

    return doc?.following ?? [];
  }

  async findByIds(ids: ObjectId[]): Promise<WithId<UserDocument>[]> {
    if (ids.length === 0) {
      return [];
    }

    return this.users.find({ _id: { $in: ids } }).toArray();
  }

  async insert(doc: Omit<UserDocument, '_id'>): Promise<WithId<UserDocument>> {
    const now = new Date();
    const document: UserDocument = {
      ...doc,
      _id: new ObjectId(),
      email: doc.email.toLowerCase(),
      createdAt: now,
      updatedAt: now,
    };

    await this.users.insertOne(document);
    return document;
  }

  /** Una clave a `null` se quita del documento: un campo vacío no se guarda como `null`. */
  async updateById(
    id: string,
    update: { [K in keyof UserDocument]?: UserDocument[K] | null },
  ): Promise<WithId<UserDocument> | null> {
    const entries = Object.entries(update);

    await this.users.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          ...Object.fromEntries(entries.filter(([, value]) => value !== null)),
          updatedAt: new Date(),
        },
        $unset: Object.fromEntries(
          entries
            .filter(([, value]) => value === null)
            .map(([key]) => [key, '']),
        ),
      },
    );

    return this.findById(id);
  }

  /** Escribe solo los ajustes recibidos, sin leer antes el grupo: dos cambios seguidos no se pisan. */
  updatePreferences(
    id: string,
    patch: { [G in keyof UserPreferences]?: Partial<UserPreferences[G]> },
  ) {
    const fields = Object.entries(patch).flatMap(([group, values]) =>
      Object.entries(values).map(([key, value]) => [
        `preferences.${group}.${key}`,
        value,
      ]),
    );

    return this.users.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { ...Object.fromEntries(fields), updatedAt: new Date() } },
      { returnDocument: 'after' },
    );
  }

  async updatePassword(id: string, hashedPassword: string): Promise<void> {
    await this.users.updateOne(
      { _id: new ObjectId(id) },
      { $set: { password: hashedPassword, updatedAt: new Date() } },
    );
  }

  async findRanking(limit: number): Promise<WithId<UserDocument>[]> {
    return this.users.find().sort({ experience: -1 }).limit(limit).toArray();
  }

  /** `false` si alguno de los dos ya no existe: su borrado se ha cruzado. */
  async addFollow(viewerId: string, targetId: string, session: ClientSession) {
    const now = new Date();

    const viewer = await this.users.updateOne(
      { _id: new ObjectId(viewerId) },
      {
        $addToSet: { following: new ObjectId(targetId) },
        $set: { updatedAt: now },
      },
      { session },
    );
    const target = await this.users.updateOne(
      { _id: new ObjectId(targetId) },
      {
        $addToSet: { followers: new ObjectId(viewerId) },
        $set: { updatedAt: now },
      },
      { session },
    );

    return viewer.matchedCount === 1 && target.matchedCount === 1;
  }

  /**
   * Escribe en el usuario dentro de `session` para que el borrado de su cuenta,
   * si corre a la vez, choque con esta transacción: Mongo no detecta el choque
   * entre leer un documento y que otra transacción lo borre. `null` si ya no existe.
   */
  lockActive(id: string, session: ClientSession) {
    return this.users.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { updatedAt: new Date() } },
      { returnDocument: 'after', session },
    );
  }

  async removeFollow(
    viewerId: string,
    targetId: string,
    session: ClientSession,
  ): Promise<void> {
    const now = new Date();

    await this.users.updateOne(
      { _id: new ObjectId(viewerId) },
      {
        $pull: { following: new ObjectId(targetId) },
        $set: { updatedAt: now },
      },
      { session },
    );
    await this.users.updateOne(
      { _id: new ObjectId(targetId) },
      {
        $pull: { followers: new ObjectId(viewerId) },
        $set: { updatedAt: now },
      },
      { session },
    );
  }

  /** Borra el usuario y lo saca de `followers` y `following` de los demás. */
  async deleteWithFollows(id: string, session: ClientSession): Promise<void> {
    const user = new ObjectId(id);

    // simplificación: sin índice en esos arrays, recorre users; vale hasta miles.
    await this.users.updateMany(
      { $or: [{ followers: user }, { following: user }] },
      {
        $pull: { followers: user, following: user },
        $set: { updatedAt: new Date() },
      },
      { session },
    );
    await this.users.deleteOne({ _id: user }, { session });
  }

  /** Devuelve el progreso de antes del cambio; `null` si el usuario ya no existe. */
  setProgress(id: string, lastWatchedEpisode: number, experience: number) {
    return this.users.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { lastWatchedEpisode, experience, updatedAt: new Date() } },
      {
        returnDocument: 'before',
        projection: { lastWatchedEpisode: 1, experience: 1 },
      },
    );
  }
}
