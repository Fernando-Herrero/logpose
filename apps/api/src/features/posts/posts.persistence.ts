import { InjectCollection } from '@jperezmart/nest-mongodb';
import {
  POST_FEED_PAGE_SIZE,
  type PostPageQuery,
} from '@logpose/contracts/common/post.schemas';
import { Injectable, type OnModuleInit } from '@nestjs/common';
import {
  type ClientSession,
  type Collection,
  type Filter,
  ObjectId,
  type WithId,
} from 'mongodb';

import {
  decodePostCursor,
  encodePostCursor,
  type PostDocument,
} from './posts.mappers.js';

type NewPost = Pick<
  PostDocument,
  'text' | 'userId' | 'images' | 'visibility' | 'language'
> &
  Partial<Pick<PostDocument, 'shareToken' | 'retweetOf'>>;

/**
 * Los métodos de lectura reciben `visible` (`visiblePostsFilter`): un post que
 * el viewer no puede ver no se lista, no se cuenta y no se toca.
 */
@Injectable()
export class PostsPersistence implements OnModuleInit {
  constructor(
    @InjectCollection('posts')
    private readonly posts: Collection<PostDocument>,
  ) {}

  async onModuleInit() {
    await this.posts.createIndexes([
      // Sin `visibility` delante: el filtro del admin y del usuario no la fija.
      { key: { isDeleted: 1, createdAt: -1, _id: -1 } },
      { key: { userId: 1, createdAt: -1, _id: -1 } },
      { key: { likes: 1, createdAt: -1, _id: -1 } },
      { key: { bookmarks: 1, createdAt: -1, _id: -1 } },
      { key: { retweetOf: 1 } },
    ]);
  }

  count(filter: Filter<PostDocument>, visible: Filter<PostDocument>) {
    return this.posts.countDocuments({
      $and: [filter, visible],
      isDeleted: false,
    });
  }

  async findVisibleIds(ids: ObjectId[], visible: Filter<PostDocument>) {
    const rows = await this.posts
      .find(
        { ...visible, _id: { $in: ids }, isDeleted: false },
        { projection: { _id: 1 } },
      )
      .toArray();

    return rows.map(row => row._id);
  }

  findByIds(ids: ObjectId[], visible: Filter<PostDocument>) {
    if (ids.length === 0) {
      return Promise.resolve([] as WithId<PostDocument>[]);
    }

    return this.posts
      .find({
        ...visible,
        _id: { $in: ids },
        isDeleted: false,
      })
      .toArray();
  }

  /**
   * Borra sus posts (originales y retweets) y los retweets ajenos de sus
   * originales, y quita su rastro de los posts ajenos: likes, bookmarks y
   * retweets, con sus contadores. Devuelve los ids de sus posts.
   */
  async deleteByUser(userId: string, session: ClientSession) {
    const user = new ObjectId(userId);
    const own = await this.posts
      .find({ userId: user }, { projection: { retweetOf: 1 }, session })
      .toArray();
    const ownIds = own.map(post => post._id);

    // Solo los originales que aún listan su retweet: los deshechos ya salieron.
    await this.posts.updateMany(
      {
        _id: { $in: own.flatMap(post => post.retweetOf ?? []) },
        retweets: { $in: ownIds },
      },
      {
        $pullAll: { retweets: ownIds },
        $inc: { retweetsCount: -1 },
        $set: { updatedAt: new Date() },
      },
      { session },
    );
    await this.posts.updateMany(
      { likes: user },
      { $pull: { likes: user }, $inc: { likesCount: -1 } },
      { session },
    );
    await this.posts.updateMany(
      { bookmarks: user },
      { $pull: { bookmarks: user }, $inc: { bookmarksCount: -1 } },
      { session },
    );
    await this.posts.deleteMany(
      { $or: [{ userId: user }, { retweetOf: { $in: ownIds } }] },
      { session },
    );

    return ownIds;
  }

  /** Fija `commentsCount` de cada post al recuento que le llega. */
  async syncCommentsCount(
    counts: { postId: ObjectId; count: number }[],
    session: ClientSession,
  ) {
    // `bulkWrite` lanza con la lista vacía.
    if (counts.length === 0) {
      return;
    }

    await this.posts.bulkWrite(
      counts.map(({ postId, count }) => ({
        updateOne: {
          filter: { _id: postId },
          update: { $set: { commentsCount: count } },
        },
      })),
      { session },
    );
  }

  /**
   * Una página de `filter` del más nuevo al más viejo. El cursor es el último
   * post de la página anterior (`createdAt|_id`).
   */
  async findPage(
    filter: Filter<PostDocument>,
    visible: Filter<PostDocument>,
    { limit = POST_FEED_PAGE_SIZE, cursor }: PostPageQuery,
  ) {
    // `$and` y no spread: `visible` y `after` pueden traer los dos un `$or`.
    const rows = await this.posts
      .find({ $and: [filter, visible, afterCursor(cursor)], isDeleted: false })
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit + 1)
      .toArray();

    return toPage(rows, limit);
  }

  /**
   * Como `findPage`, pero cada post sale una vez: el original y sus retweets
   * cuentan como uno y queda su aparición más reciente.
   * Techo: agrupa todo lo que casa con `filter` en cada página; vale hasta
   * decenas de miles de posts. La salida es un timeline guardado por usuario.
   */
  async findPageOncePerPost(
    filter: Filter<PostDocument>,
    visible: Filter<PostDocument>,
    { limit = POST_FEED_PAGE_SIZE, cursor }: PostPageQuery,
  ) {
    const rows = await this.posts
      .aggregate<WithId<PostDocument>>([
        { $match: { $and: [filter, visible], isDeleted: false } },
        { $sort: { createdAt: -1, _id: -1 } },
        {
          $group: {
            _id: { $ifNull: ['$retweetOf', '$_id'] },
            post: { $first: '$$ROOT' },
          },
        },
        { $replaceWith: '$post' },
        { $sort: { createdAt: -1, _id: -1 } },
        // El cursor va tras agrupar: antes, un post ya servido volvería en la
        // página siguiente con una aparición más vieja.
        { $match: afterCursor(cursor) },
        { $limit: limit + 1 },
      ])
      .toArray();

    return toPage(rows, limit);
  }

  findActiveById(id: string, session?: ClientSession) {
    return this.posts.findOne(
      { _id: new ObjectId(id), isDeleted: false },
      { session },
    );
  }

  findVisibleById(id: string, visible: Filter<PostDocument>) {
    return this.posts.findOne({
      ...visible,
      _id: new ObjectId(id),
      isDeleted: false,
    });
  }

  /**
   * Añade o quita `userId` del array `likes` o `bookmarks` y ajusta el contador
   * denormalizado. Sin leer antes: el primer `findOneAndUpdate` solo casa si el
   * usuario no está y lo añade; si no casa, el segundo lo quita; si tampoco,
   * el post no existe o no se ve. Va en la transacción de `session`: un toggle
   * a la vez sobre el mismo post da conflicto de escritura y el driver repite
   * la transacción entera, así que el contador no se descuadra.
   * Devuelve el post actualizado y si el usuario ya tenía el flag antes.
   */
  async toggleUserField(
    postId: string,
    userId: string,
    field: 'likes' | 'bookmarks',
    visible: Filter<PostDocument>,
    session: ClientSession,
  ) {
    const user = new ObjectId(userId);
    const countField = field === 'likes' ? 'likesCount' : 'bookmarksCount';
    const post = { ...visible, _id: new ObjectId(postId), isDeleted: false };
    const added = await this.posts.findOneAndUpdate(
      { ...post, [field]: { $ne: user } },
      { $addToSet: { [field]: user }, $inc: { [countField]: 1 } },
      { returnDocument: 'after', session },
    );

    if (added) {
      return { post: added, alreadyHad: false };
    }

    const removed = await this.posts.findOneAndUpdate(
      { ...post, [field]: user },
      { $pull: { [field]: user }, $inc: { [countField]: -1 } },
      { returnDocument: 'after', session },
    );

    return removed ? { post: removed, alreadyHad: true } : null;
  }

  /**
   * Un retweet es un eco de un original: si el original desaparece, sus
   * copias también. Se cascada aquí (no solo en `posts.service.delete`)
   * porque el otro llamante (deshacer un retweet en `toggleRetweet`) siempre
   * opera sobre un wrapper, que nunca tiene hijos — el `updateMany` no
   * encuentra nada y es un no-op barato.
   */
  async softDeleteById(id: string, session?: ClientSession) {
    const objectId = new ObjectId(id);
    const deleted = await this.posts.findOneAndUpdate(
      { _id: objectId, isDeleted: false },
      { $set: { isDeleted: true, updatedAt: new Date() } },
      { returnDocument: 'after', session },
    );

    if (deleted && !deleted.isRetweet) {
      await this.posts.updateMany(
        { retweetOf: objectId, isDeleted: false },
        { $set: { isDeleted: true, updatedAt: new Date() } },
        { session },
      );
    }

    return deleted;
  }

  async findRetweetedOriginalIds(userId: string, originalIds: string[]) {
    const validIds = originalIds.filter(id => ObjectId.isValid(id));

    if (validIds.length === 0) {
      return new Set<string>();
    }

    const rows = await this.posts
      .find(
        {
          userId: new ObjectId(userId),
          retweetOf: { $in: validIds.map(id => new ObjectId(id)) },
          isRetweet: true,
          isDeleted: false,
        },
        { projection: { retweetOf: 1 } },
      )
      .toArray();

    return new Set(rows.map(row => row.retweetOf!.toString()));
  }

  findUserRetweet(userId: string, originalId: string, session?: ClientSession) {
    return this.posts.findOne(
      {
        userId: new ObjectId(userId),
        retweetOf: new ObjectId(originalId),
        isRetweet: true,
        isDeleted: false,
      },
      { session },
    );
  }

  /** Sin rollback propio: si devuelve `null` a mitad, quien llama lanza y la transacción de `session` deshace lo escrito. */
  async toggleRetweet(
    originalId: string,
    userId: string,
    session: ClientSession,
  ) {
    const original = await this.findActiveById(originalId, session);

    if (!original || original.isRetweet) {
      return null;
    }

    const existing = await this.findUserRetweet(userId, originalId, session);

    if (existing) {
      await this.softDeleteById(existing._id.toString(), session);

      const updated = await this.posts.findOneAndUpdate(
        { _id: new ObjectId(originalId), isDeleted: false },
        {
          $pull: { retweets: existing._id },
          $inc: { retweetsCount: -1 },
          $set: { updatedAt: new Date() },
        },
        { returnDocument: 'after', session },
      );

      if (!updated) {
        return null;
      }

      return { original: updated, retweeted: false };
    }

    const retweetPost = await this.insert(
      {
        text: original.text,
        userId: new ObjectId(userId),
        images: original.images,
        visibility: 'public',
        language: original.language,
        retweetOf: original._id,
      },
      session,
    );

    const updated = await this.posts.findOneAndUpdate(
      { _id: new ObjectId(originalId), isDeleted: false },
      {
        $addToSet: { retweets: retweetPost._id },
        $inc: { retweetsCount: 1 },
        $set: { updatedAt: new Date() },
      },
      { returnDocument: 'after', session },
    );

    return updated ? { original: updated, retweeted: true } : null;
  }

  /** Único constructor de posts: el resto de campos empieza vacío. */
  async insert(data: NewPost, session?: ClientSession) {
    const now = new Date();
    const document: PostDocument = {
      ...data,
      _id: new ObjectId(),
      images: data.images ?? [],
      isDeleted: false,
      isRetweet: data.retweetOf !== undefined,
      isReply: false,
      likes: [],
      bookmarks: [],
      likesCount: 0,
      bookmarksCount: 0,
      commentsCount: 0,
      retweetsCount: 0,
      hashtags: [],
      mentions: [],
      retweets: [],
      createdAt: now,
      updatedAt: now,
    };

    await this.posts.insertOne(document, { session });
    return document;
  }
}

/** Lo que va detrás del cursor, el último post de la página anterior. */
function afterCursor(cursor: PostPageQuery['cursor']): Filter<PostDocument> {
  const decoded = cursor ? decodePostCursor(cursor) : null;

  return decoded
    ? {
        $or: [
          { createdAt: { $lt: decoded.createdAt } },
          { createdAt: decoded.createdAt, _id: { $lt: decoded.id } },
        ],
      }
    : {};
}

/** `rows` trae una fila de sobra que solo dice si hay otra página. */
function toPage(rows: WithId<PostDocument>[], limit: number) {
  const posts = rows.slice(0, limit);
  const last = posts.at(-1);

  return {
    posts,
    nextCursor: rows.length > limit && last ? encodePostCursor(last) : null,
  };
}
