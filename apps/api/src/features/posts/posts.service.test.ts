import 'reflect-metadata';

import { MongoTransactionService } from '@jperezmart/nest-mongodb';
import { DEFAULT_USER_PREFERENCES } from '@logpose/contracts/common/user.schemas';
import type { PostFeed } from '@logpose/contracts/features/posts/schemas';
import { type ClientSession, type Db, MongoClient, ObjectId } from 'mongodb';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { mongoClientOptions } from '../../integrations/mongodb/mongodb.config.js';
import type { UserViewer, Viewer } from '../auth/access.js';
import { NotificationEventsPersistence } from '../notifications/notification-events.persistence.js';
import { NotificationsPersistence } from '../notifications/notifications.persistence.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { NotificationsWorker } from '../notifications/notifications.worker.js';
import type { UserDocument } from '../users/user.mappers.js';
import { UsersPersistence } from '../users/users.persistence.js';
import type { PostDocument } from './posts.mappers.js';
import { PostsPersistence } from './posts.persistence.js';
import { PostsService } from './posts.service.js';

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

const userViewer = (id: string): UserViewer => ({
  kind: 'user',
  id,
  role: 'user',
});

/** El admin no existe en Mongo: el rol viaja en el viewer. */
const adminViewer = (): Viewer => ({
  kind: 'user',
  id: new ObjectId().toString(),
  role: 'admin',
});

let replSet: MongoMemoryReplSet;
let client: MongoClient;
let db: Db;
/** Sesión sin transacción para sembrar con métodos que la exigen. */
let session: ClientSession;
let usersPersistence: UsersPersistence;
let postsPersistence: PostsPersistence;
let service: PostsService;
let worker: NotificationsWorker;

beforeAll(async () => {
  // Las transacciones exigen replica set.
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  client = await MongoClient.connect(replSet.getUri(), mongoClientOptions);
  db = client.db('test');
  session = client.startSession();

  usersPersistence = new UsersPersistence(db.collection('users'));
  await usersPersistence.onModuleInit();
  const notificationsPersistence = new NotificationsPersistence(
    db.collection('notifications'),
  );
  await notificationsPersistence.onModuleInit();
  const notificationEventsPersistence = new NotificationEventsPersistence(
    db.collection('notification_events'),
  );
  await notificationEventsPersistence.onModuleInit();
  const notificationsService = new NotificationsService(
    usersPersistence,
    notificationsPersistence,
    notificationEventsPersistence,
  );
  worker = new NotificationsWorker(
    notificationEventsPersistence,
    notificationsService,
  );
  postsPersistence = new PostsPersistence(db.collection('posts'));
  service = new PostsService(
    postsPersistence,
    usersPersistence,
    notificationsService,
    new MongoTransactionService(client),
  );
}, 120_000);

afterAll(async () => {
  await session.endSession();
  await client.close();
  await replSet.stop();
});

/** Siembra un dueño con un post de cada visibilidad, un seguidor y un ajeno. */
async function seedOwnerWithPosts(prefix: string) {
  const owner = await usersPersistence.insert(newUser(`${prefix}_owner`));
  const follower = await usersPersistence.insert(newUser(`${prefix}_follower`));
  const other = await usersPersistence.insert(newUser(`${prefix}_other`));
  const ownerId = owner._id.toString();
  const followerId = follower._id.toString();
  await usersPersistence.addFollow(followerId, ownerId, session);

  const post = (visibility: PostDocument['visibility']) =>
    postsPersistence.insert({
      text: `${prefix} ${visibility}`,
      userId: owner._id,
      visibility,
      language: 'es',
    });

  return {
    ownerId,
    followerId,
    otherId: other._id.toString(),
    publicId: (await post('public'))._id.toString(),
    privateId: (await post('private'))._id.toString(),
    followersId: (await post('followers'))._id.toString(),
  };
}

// El límite máximo del contrato basta: el fichero siembra menos de 50 posts.
const feed = (viewer: Viewer, kind: PostFeed = 'all') =>
  service.list({ limit: 50, feed: kind }, viewer);

const feedIds = async (viewer: Viewer, kind: PostFeed = 'all') =>
  (await feed(viewer, kind)).posts.map(post => post._id);

/** Fija la fecha de un post para ordenar el feed a voluntad. */
const setCreatedAt = (id: string, createdAt: Date) =>
  db
    .collection<PostDocument>('posts')
    .updateOne({ _id: new ObjectId(id) }, { $set: { createdAt } });

const postById = (id: string) =>
  db.collection<PostDocument>('posts').findOne({ _id: new ObjectId(id) });

/** Ningún evento cumple el validador: toda inserción en `notification_events` falla mientras corre `run`. */
async function withEventInsertsFailing(run: () => Promise<unknown>) {
  await db.command({
    collMod: 'notification_events',
    validator: { never: { $exists: true } },
  });
  try {
    await run();
  } finally {
    await db.command({ collMod: 'notification_events', validator: {} });
  }
}

describe('PostsService.list', () => {
  let seed: Awaited<ReturnType<typeof seedOwnerWithPosts>>;
  let orphanRetweetId: string;

  beforeAll(async () => {
    seed = await seedOwnerWithPosts('feed');

    // Retweet público de un post público: debe salir y serializarse sin arrays.
    await postsPersistence.toggleRetweet(seed.publicId, seed.otherId, session);

    // Retweet antiguo de un post que hoy es privado: el wrapper es público.
    const now = new Date();
    orphanRetweetId = new ObjectId().toString();
    await db.collection<PostDocument>('posts').insertOne({
      _id: new ObjectId(orphanRetweetId),
      text: 'feed private',
      userId: new ObjectId(seed.followerId),
      images: [],
      visibility: 'public',
      isDeleted: false,
      isRetweet: true,
      retweetOf: new ObjectId(seed.privateId),
      isReply: false,
      language: 'es',
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
    });
  });

  it('un anónimo solo ve los posts públicos', async () => {
    const ids = await feedIds({ kind: 'anonymous' });

    expect(ids).toContain(seed.publicId);
    expect(ids).not.toContain(seed.privateId);
    expect(ids).not.toContain(seed.followersId);
  });

  it('otro usuario que no sigue al dueño solo ve los posts públicos', async () => {
    const ids = await feedIds(userViewer(seed.otherId));

    expect(ids).toContain(seed.publicId);
    expect(ids).not.toContain(seed.privateId);
    expect(ids).not.toContain(seed.followersId);
  });

  it('un seguidor ve también los posts para seguidores del dueño', async () => {
    const ids = await feedIds(userViewer(seed.followerId));

    expect(ids).toContain(seed.publicId);
    expect(ids).toContain(seed.followersId);
    expect(ids).not.toContain(seed.privateId);
  });

  it('el dueño ve también sus posts privados y para seguidores', async () => {
    const ids = await feedIds(userViewer(seed.ownerId));

    expect(ids).toContain(seed.publicId);
    expect(ids).toContain(seed.privateId);
    expect(ids).toContain(seed.followersId);
  });

  it('un admin ve todos los posts', async () => {
    const ids = await feedIds(adminViewer());

    expect(ids).toContain(seed.publicId);
    expect(ids).toContain(seed.privateId);
    expect(ids).toContain(seed.followersId);
  });

  it('ningún post del feed lleva likes ni bookmarks, tampoco los retweets', async () => {
    const posts = [
      ...(await feed(adminViewer())).posts,
      ...(await feed(userViewer(seed.otherId), 'following')).posts,
    ];

    expect(posts.some(post => post.isRetweet)).toBe(true);
    posts.forEach(post => {
      expect(post).not.toHaveProperty('likes');
      expect(post).not.toHaveProperty('bookmarks');
      expect(post).toHaveProperty('likesCount');
      expect(post).toHaveProperty('bookmarksCount');
    });
  });

  it('un retweet cuyo original no puede ver el viewer no sale en su feed', async () => {
    // El envoltorio es suyo, pero el original es privado del dueño.
    await expect(
      feedIds(userViewer(seed.followerId), 'following'),
    ).resolves.not.toContain(orphanRetweetId);
  });
});

describe('PostsService.list, «Todos» y «Siguiendo»', () => {
  // Yo sigo a Luffy y a Zoro, no al ajeno. Del más nuevo al más viejo:
  // retuiteo un post del ajeno, Zoro retuitea el de Luffy, publico el mío,
  // el ajeno publica otro, Luffy publica el suyo y antes uno para seguidores
  // y uno privado.
  let me: string;
  const ids = {} as Record<
    | 'mine'
    | 'luffy'
    | 'luffyFollowers'
    | 'luffyPrivate'
    | 'other'
    | 'otherRetweeted'
    | 'zoroWrapper'
    | 'myWrapper',
    string
  >;

  beforeAll(async () => {
    const user = async (name: string) =>
      (await usersPersistence.insert(newUser(`tl_${name}`)))._id.toString();
    const post = async (
      userId: string,
      at: number,
      visibility: PostDocument['visibility'] = 'public',
    ) => {
      const { _id } = await postsPersistence.insert({
        text: 'tl',
        userId: new ObjectId(userId),
        visibility,
        language: 'es',
      });
      await setCreatedAt(_id.toString(), new Date(at));
      return _id.toString();
    };
    const retweet = async (userId: string, originalId: string, at: number) => {
      await service.toggleRetweet(originalId, userViewer(userId));
      const wrapper = await postsPersistence.findUserRetweet(
        userId,
        originalId,
      );
      await setCreatedAt(wrapper!._id.toString(), new Date(at));
      return wrapper!._id.toString();
    };

    me = await user('me');
    const luffy = await user('luffy');
    const zoro = await user('zoro');
    const other = await user('other');
    await usersPersistence.addFollow(me, luffy, session);
    await usersPersistence.addFollow(me, zoro, session);

    const hour = 3600 * 1000;
    const now = Date.now();
    ids.luffyPrivate = await post(luffy, now - 7 * hour, 'private');
    ids.luffyFollowers = await post(luffy, now - 6 * hour, 'followers');
    ids.luffy = await post(luffy, now - 5 * hour);
    ids.otherRetweeted = await post(other, now - 4 * hour);
    ids.other = await post(other, now - 3 * hour);
    ids.mine = await post(me, now - 2 * hour);
    ids.zoroWrapper = await retweet(zoro, ids.luffy, now - hour);
    ids.myWrapper = await retweet(me, ids.otherRetweeted, now - hour / 2);
  });

  it('«Todos» no trae retweets', async () => {
    const { posts } = await feed(userViewer(me));

    expect(posts.map(post => post._id)).toContain(ids.luffy);
    expect(posts.some(post => post.isRetweet)).toBe(false);
  });

  it('«Siguiendo» trae lo mío y lo de quien sigo, cada post una vez y en su aparición más reciente', async () => {
    await expect(feedIds(userViewer(me), 'following')).resolves.toEqual([
      ids.myWrapper,
      ids.zoroWrapper,
      ids.mine,
      ids.luffyFollowers,
    ]);
  });

  it('«Siguiendo» con «Mostrar retweets» apagado no trae retweets', async () => {
    const users = db.collection<UserDocument>('users');
    const setShowRetweets = (showRetweets: boolean) =>
      users.updateOne(
        { _id: new ObjectId(me) },
        { $set: { 'preferences.timeline.showRetweets': showRetweets } },
      );

    await setShowRetweets(false);
    try {
      await expect(feedIds(userViewer(me), 'following')).resolves.toEqual([
        ids.mine,
        ids.luffy,
        ids.luffyFollowers,
      ]);
    } finally {
      await setShowRetweets(true);
    }
  });

  it('«Siguiendo» sin sesión lanza UNAUTHORIZED', async () => {
    await expect(
      feed({ kind: 'anonymous' }, 'following'),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('la página 2 de «Siguiendo» no repite un post de la 1 con una aparición más vieja', async () => {
    const viewer = userViewer(me);
    const first = await service.list({ limit: 2, feed: 'following' }, viewer);
    const second = await service.list(
      { limit: 2, feed: 'following', cursor: first.nextCursor! },
      viewer,
    );

    expect(first.posts.map(post => post._id)).toEqual([
      ids.myWrapper,
      ids.zoroWrapper,
    ]);
    expect(second.posts.map(post => post._id)).toEqual([
      ids.mine,
      ids.luffyFollowers,
    ]);
    expect(second.nextCursor).toBeNull();
  });
});

describe('PostsService.toggleLike y toggleBookmark', () => {
  let seed: Awaited<ReturnType<typeof seedOwnerWithPosts>>;

  beforeAll(async () => {
    seed = await seedOwnerWithPosts('toggle');
  });

  it('dos likes seguidos del mismo usuario: el primero lo da y el segundo lo quita', async () => {
    const viewer = userViewer(seed.otherId);

    await expect(
      service.toggleLike(seed.publicId, viewer),
    ).resolves.toMatchObject({ liked: true, likesCount: 1 });
    await expect(
      service.toggleLike(seed.publicId, viewer),
    ).resolves.toMatchObject({ liked: false, likesCount: 0 });
  });

  it('dos bookmarks seguidos del mismo usuario: el primero lo guarda y el segundo lo quita', async () => {
    const viewer = userViewer(seed.otherId);

    await expect(
      service.toggleBookmark(seed.publicId, viewer),
    ).resolves.toMatchObject({ bookmarked: true, bookmarksCount: 1 });
    await expect(
      service.toggleBookmark(seed.publicId, viewer),
    ).resolves.toMatchObject({ bookmarked: false, bookmarksCount: 0 });
  });

  it('un seguidor puede dar like a un post para seguidores', async () => {
    await expect(
      service.toggleLike(seed.followersId, userViewer(seed.followerId)),
    ).resolves.toMatchObject({ liked: true, likesCount: 1 });
  });

  it('like sobre un post privado ajeno lanza POST_NOT_FOUND', async () => {
    await expect(
      service.toggleLike(seed.privateId, userViewer(seed.otherId)),
    ).rejects.toMatchObject({ code: 'POST_NOT_FOUND' });
  });

  it('like sobre un post para seguidores sin seguir al dueño lanza POST_NOT_FOUND', async () => {
    await expect(
      service.toggleLike(seed.followersId, userViewer(seed.otherId)),
    ).rejects.toMatchObject({ code: 'POST_NOT_FOUND' });
  });

  it('bookmark sobre un post privado ajeno lanza POST_NOT_FOUND', async () => {
    await expect(
      service.toggleBookmark(seed.privateId, userViewer(seed.otherId)),
    ).rejects.toMatchObject({ code: 'POST_NOT_FOUND' });
  });
});

describe('PostsService.toggleRetweet', () => {
  let seed: Awaited<ReturnType<typeof seedOwnerWithPosts>>;

  beforeAll(async () => {
    seed = await seedOwnerWithPosts('retweet');
  });

  it('retweet de un post privado ajeno lanza POST_NOT_FOUND', async () => {
    await expect(
      service.toggleRetweet(seed.privateId, userViewer(seed.otherId)),
    ).rejects.toMatchObject({ code: 'POST_NOT_FOUND' });
  });

  it('retweet de un post para seguidores sin seguir al dueño lanza POST_NOT_FOUND', async () => {
    await expect(
      service.toggleRetweet(seed.followersId, userViewer(seed.otherId)),
    ).rejects.toMatchObject({ code: 'POST_NOT_FOUND' });
  });

  it('retweet del propio post privado lanza FORBIDDEN', async () => {
    await expect(
      service.toggleRetweet(seed.privateId, userViewer(seed.ownerId)),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('retweet de un post para seguidores de alguien a quien sigue lanza FORBIDDEN', async () => {
    await expect(
      service.toggleRetweet(seed.followersId, userViewer(seed.followerId)),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
});

describe('PostsService.delete', () => {
  let seed: Awaited<ReturnType<typeof seedOwnerWithPosts>>;

  beforeAll(async () => {
    seed = await seedOwnerWithPosts('delete');
  });

  it('borrar un post privado ajeno lanza POST_NOT_FOUND, no FORBIDDEN', async () => {
    await expect(
      service.delete(seed.privateId, userViewer(seed.otherId)),
    ).rejects.toMatchObject({ code: 'POST_NOT_FOUND' });
  });

  it('un seguidor que borra un post para seguidores del dueño recibe FORBIDDEN', async () => {
    await expect(
      service.delete(seed.followersId, userViewer(seed.followerId)),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('el dueño borra su propio post privado y deja de salir en su feed', async () => {
    const owner = userViewer(seed.ownerId);

    await expect(service.delete(seed.privateId, owner)).resolves.toMatchObject({
      _id: seed.privateId,
    });
    await expect(feedIds(owner)).resolves.not.toContain(seed.privateId);
  });
});

describe('PostsService, toggles concurrentes', () => {
  let seed: Awaited<ReturnType<typeof seedOwnerWithPosts>>;

  beforeAll(async () => {
    seed = await seedOwnerWithPosts('concurrent');
  });

  const storedPost = async () =>
    (await db
      .collection<PostDocument>('posts')
      .findOne({ _id: new ObjectId(seed.publicId) }))!;

  it('dos toggleLike a la vez de quien ya tiene el like no rechazan y el contador cuadra', async () => {
    const viewer = userViewer(seed.otherId);
    await service.toggleLike(seed.publicId, viewer);

    await expect(
      Promise.all([
        service.toggleLike(seed.publicId, viewer),
        service.toggleLike(seed.publicId, viewer),
      ]),
    ).resolves.toHaveLength(2);

    const post = await storedPost();
    expect(post.likesCount).toBe(post.likes.length);
  });

  it('dos toggleBookmark a la vez de quien ya tiene el bookmark no rechazan y el contador cuadra', async () => {
    const viewer = userViewer(seed.otherId);
    await service.toggleBookmark(seed.publicId, viewer);

    await expect(
      Promise.all([
        service.toggleBookmark(seed.publicId, viewer),
        service.toggleBookmark(seed.publicId, viewer),
      ]),
    ).resolves.toHaveLength(2);

    const post = await storedPost();
    expect(post.bookmarksCount).toBe(post.bookmarks.length);
  });

  // Los dos suman al contador del original: la segunda choca, se reintenta y deshace.
  it('dos toggleRetweet a la vez no dejan dos envoltorios vivos y el contador cuadra', async () => {
    const viewer = userViewer(seed.otherId);

    await expect(
      Promise.all([
        service.toggleRetweet(seed.publicId, viewer),
        service.toggleRetweet(seed.publicId, viewer),
      ]),
    ).resolves.toHaveLength(2);

    const wrappers = await db.collection<PostDocument>('posts').countDocuments({
      retweetOf: new ObjectId(seed.publicId),
      isDeleted: false,
    });
    const post = await storedPost();
    expect(wrappers).toBeLessThanOrEqual(1);
    expect(post.retweetsCount).toBe(wrappers);
    expect(post.retweets).toHaveLength(wrappers);
  });
});

describe('PostsService.list con cursor', () => {
  it('la segunda página tampoco trae posts invisibles y entre las dos salen todos los visibles sin repetir', async () => {
    const seed = await seedOwnerWithPosts('cursor');
    const viewer = userViewer(seed.otherId);

    // Del más nuevo al más viejo, con fechas futuras para quedar por delante
    // de los posts que siembran los demás tests: V = visible, I = invisible.
    const order = [
      ['V1', 'public'],
      ['I1', 'private'],
      ['I2', 'followers'],
      ['V2', 'public'],
      ['I3', 'private'],
      ['V3', 'public'],
    ] as const;
    const base = Date.now() + 365 * 24 * 3600 * 1000;
    const ids = new Map<string, string>();
    for (const [index, [name, visibility]] of order.entries()) {
      const post = await postsPersistence.insert({
        text: `cursor ${name}`,
        userId: new ObjectId(seed.ownerId),
        visibility,
        language: 'es',
      });
      await db
        .collection<PostDocument>('posts')
        .updateOne(
          { _id: post._id },
          { $set: { createdAt: new Date(base - index * 1000) } },
        );
      ids.set(name, post._id.toString());
    }

    const first = await service.list({ limit: 2, feed: 'all' }, viewer);
    const second = await service.list(
      { limit: 2, cursor: first.nextCursor!, feed: 'all' },
      viewer,
    );
    const seen = [...first.posts, ...second.posts].map(post => post._id);

    expect(first.nextCursor).not.toBeNull();
    expect(new Set(seen).size).toBe(seen.length);
    expect(seen.filter(id => [...ids.values()].includes(id))).toEqual([
      ids.get('V1'),
      ids.get('V2'),
      ids.get('V3'),
    ]);
  });
});

describe('PostsService, retweet de un post público', () => {
  let seed: Awaited<ReturnType<typeof seedOwnerWithPosts>>;
  let retweeterId: string;

  beforeAll(async () => {
    seed = await seedOwnerWithPosts('rtcard');
    retweeterId = seed.otherId;
    // Dos likes ajenos al original: el seguidor y el propio dueño.
    await service.toggleLike(seed.publicId, userViewer(seed.followerId));
    await service.toggleLike(seed.publicId, userViewer(seed.ownerId));
    await service.toggleRetweet(seed.publicId, userViewer(retweeterId));
    // El envoltorio sale en «Siguiendo» de quien sigue a quien retuiteó.
    await usersPersistence.addFollow(seed.ownerId, retweeterId, session);
    await usersPersistence.addFollow(seed.followerId, retweeterId, session);
  });

  const wrapper = async (viewer: Viewer) =>
    (await feed(viewer, 'following')).posts.find(
      post => post.isRetweet && post.retweetOf === seed.publicId,
    );

  it('sale en el feed con el autor original y los contadores del original', async () => {
    await expect(wrapper(userViewer(seed.ownerId))).resolves.toMatchObject({
      isRetweet: true,
      retweetOf: seed.publicId,
      originalAuthor: { username: 'rtcard_owner' },
      likesCount: 2,
      retweetsCount: 1,
    });
  });

  it('enseña la fecha del original, no la del retweet', async () => {
    const original = await postsPersistence.findActiveById(seed.publicId);

    await expect(wrapper(userViewer(seed.ownerId))).resolves.toMatchObject({
      createdAt: original!.createdAt!.toISOString(),
    });
  });

  it('userLiked refleja el like del viewer sobre el original', async () => {
    await expect(wrapper(userViewer(seed.followerId))).resolves.toMatchObject({
      userLiked: true,
    });
    await expect(wrapper(userViewer(retweeterId))).resolves.toMatchObject({
      userLiked: false,
    });
  });

  it('userRetweeted es true para quien retuiteó y false para los demás', async () => {
    await expect(wrapper(userViewer(retweeterId))).resolves.toMatchObject({
      userRetweeted: true,
    });
    await expect(wrapper(userViewer(seed.followerId))).resolves.toMatchObject({
      userRetweeted: false,
    });
  });
});

describe('PostsService.toggleRetweet, respuesta', () => {
  it('retuitear y deshacerlo devuelven el estado y el contador del original', async () => {
    const seed = await seedOwnerWithPosts('rttoggle');
    const viewer = userViewer(seed.otherId);

    await expect(service.toggleRetweet(seed.publicId, viewer)).resolves.toEqual(
      { retweeted: true, userRetweeted: true, retweetsCount: 1 },
    );
    await expect(service.toggleRetweet(seed.publicId, viewer)).resolves.toEqual(
      {
        retweeted: false,
        userRetweeted: false,
        retweetsCount: 0,
      },
    );
  });
});

describe('PostsService, notificaciones de like y bookmark', () => {
  const notificationsOf = async (postId: string) => {
    await worker.processPending();
    return db
      .collection('notifications')
      .find({ postId: new ObjectId(postId) })
      .toArray();
  };

  it('si crear la notificación falla, el like responde bien y la notificación llega al reintentar', async () => {
    const seed = await seedOwnerWithPosts('notiflikeretry');
    await db.command({
      collMod: 'notifications',
      validator: { never: { $exists: true } },
    });

    try {
      await expect(
        service.toggleLike(seed.publicId, userViewer(seed.otherId)),
      ).resolves.toMatchObject({ liked: true });
      await worker.processPending();
    } finally {
      await db.command({ collMod: 'notifications', validator: {} });
    }
    await worker.processPending(() => new Date(Date.now() + 2_000));

    const notifications = await notificationsOf(seed.publicId);
    expect(notifications).toHaveLength(1);
    expect(notifications[0]).toMatchObject({ type: 'like', read: false });
  });

  it('si guardar el evento falla, el like falla y no queda guardado', async () => {
    const seed = await seedOwnerWithPosts('txlike');

    await withEventInsertsFailing(() =>
      expect(
        service.toggleLike(seed.publicId, userViewer(seed.otherId)),
      ).rejects.toThrow(),
    );

    const post = await postById(seed.publicId);
    expect(post!.likes).toEqual([]);
    expect(post!.likesCount).toBe(0);
  });

  it('si guardar el evento falla, el guardado falla y no queda guardado', async () => {
    const seed = await seedOwnerWithPosts('txbook');

    await withEventInsertsFailing(() =>
      expect(
        service.toggleBookmark(seed.publicId, userViewer(seed.otherId)),
      ).rejects.toThrow(),
    );

    const post = await postById(seed.publicId);
    expect(post!.bookmarks).toEqual([]);
    expect(post!.bookmarksCount).toBe(0);
  });

  it('el like de otro usuario crea una notificación para el dueño', async () => {
    const seed = await seedOwnerWithPosts('notiflike');

    await service.toggleLike(seed.publicId, userViewer(seed.otherId));

    const notifications = await notificationsOf(seed.publicId);
    expect(notifications).toHaveLength(1);
    expect(notifications[0]).toMatchObject({ type: 'like', read: false });
    expect(String(notifications[0]!.to)).toBe(seed.ownerId);
    expect(String(notifications[0]!.from)).toBe(seed.otherId);
  });

  it('el like del dueño a su propio post no crea notificación', async () => {
    const seed = await seedOwnerWithPosts('notiflikeown');

    await service.toggleLike(seed.publicId, userViewer(seed.ownerId));

    await expect(notificationsOf(seed.publicId)).resolves.toHaveLength(0);
  });

  it('el bookmark de otro usuario crea una notificación para el dueño', async () => {
    const seed = await seedOwnerWithPosts('notifbook');

    await service.toggleBookmark(seed.publicId, userViewer(seed.otherId));

    const notifications = await notificationsOf(seed.publicId);
    expect(notifications).toHaveLength(1);
    expect(notifications[0]).toMatchObject({ type: 'bookmark', read: false });
    expect(String(notifications[0]!.to)).toBe(seed.ownerId);
    expect(String(notifications[0]!.from)).toBe(seed.otherId);
  });

  it('el bookmark del dueño a su propio post no crea notificación', async () => {
    const seed = await seedOwnerWithPosts('notifbookown');

    await service.toggleBookmark(seed.publicId, userViewer(seed.ownerId));

    await expect(notificationsOf(seed.publicId)).resolves.toHaveLength(0);
  });

  const setOwnerPreferences = (
    ownerId: string,
    update: Record<string, unknown>,
  ) => db.collection('users').updateOne({ _id: new ObjectId(ownerId) }, update);

  it('con likes apagado en los ajustes del dueño, el like no crea notificación', async () => {
    const seed = await seedOwnerWithPosts('notiflikeoff');
    await setOwnerPreferences(seed.ownerId, {
      $set: { 'preferences.notifications.likes': false },
    });

    await service.toggleLike(seed.publicId, userViewer(seed.otherId));

    await expect(notificationsOf(seed.publicId)).resolves.toHaveLength(0);
  });

  it('si el dueño no tiene ajustes guardados, el like crea notificación', async () => {
    const seed = await seedOwnerWithPosts('notiflikenoprefs');
    await setOwnerPreferences(seed.ownerId, { $unset: { preferences: '' } });

    await service.toggleLike(seed.publicId, userViewer(seed.otherId));

    await expect(notificationsOf(seed.publicId)).resolves.toHaveLength(1);
  });

  it('con bookmarks apagado en los ajustes del dueño, el bookmark no crea notificación', async () => {
    const seed = await seedOwnerWithPosts('notifbookoff');
    await setOwnerPreferences(seed.ownerId, {
      $set: { 'preferences.notifications.bookmarks': false },
    });

    await service.toggleBookmark(seed.publicId, userViewer(seed.otherId));

    await expect(notificationsOf(seed.publicId)).resolves.toHaveLength(0);
  });

  it('si el dueño no tiene ajustes guardados, el bookmark crea notificación', async () => {
    const seed = await seedOwnerWithPosts('notifbooknoprefs');
    await setOwnerPreferences(seed.ownerId, { $unset: { preferences: '' } });

    await service.toggleBookmark(seed.publicId, userViewer(seed.otherId));

    await expect(notificationsOf(seed.publicId)).resolves.toHaveLength(1);
  });

  it('apagar likes no afecta al bookmark: sigue creando notificación', async () => {
    const seed = await seedOwnerWithPosts('notifindep');
    await setOwnerPreferences(seed.ownerId, {
      $set: { 'preferences.notifications.likes': false },
    });

    await service.toggleBookmark(seed.publicId, userViewer(seed.otherId));

    const notifications = await notificationsOf(seed.publicId);
    expect(notifications).toHaveLength(1);
    expect(notifications[0]).toMatchObject({ type: 'bookmark' });
  });

  it('like, quitar el like y like otra vez dejan una sola notificación', async () => {
    const seed = await seedOwnerWithPosts('notifdedupelike');
    const viewer = userViewer(seed.otherId);

    await service.toggleLike(seed.publicId, viewer);
    await service.toggleLike(seed.publicId, viewer);
    await service.toggleLike(seed.publicId, viewer);

    const notifications = await notificationsOf(seed.publicId);
    expect(notifications).toHaveLength(1);
    expect(notifications[0]).toMatchObject({ type: 'like' });
  });

  it('guardar, quitar y guardar otra vez dejan una sola notificación', async () => {
    const seed = await seedOwnerWithPosts('notifdedupebook');
    const viewer = userViewer(seed.otherId);

    await service.toggleBookmark(seed.publicId, viewer);
    await service.toggleBookmark(seed.publicId, viewer);
    await service.toggleBookmark(seed.publicId, viewer);

    const notifications = await notificationsOf(seed.publicId);
    expect(notifications).toHaveLength(1);
    expect(notifications[0]).toMatchObject({ type: 'bookmark' });
  });

  it('repetir el like no cambia la notificación leída: mismo _id, createdAt y read', async () => {
    const seed = await seedOwnerWithPosts('notifdedupekeep');
    const viewer = userViewer(seed.otherId);
    await service.toggleLike(seed.publicId, viewer);
    await worker.processPending();
    await db
      .collection('notifications')
      .updateMany(
        { postId: new ObjectId(seed.publicId) },
        { $set: { read: true } },
      );
    const [before] = await notificationsOf(seed.publicId);

    await service.toggleLike(seed.publicId, viewer);
    await service.toggleLike(seed.publicId, viewer);

    const after = await notificationsOf(seed.publicId);
    expect(after).toHaveLength(1);
    expect(after[0]!.read).toBe(true);
    expect(String(after[0]!._id)).toBe(String(before!._id));
    expect(after[0]!.createdAt).toEqual(before!.createdAt);
  });
});

describe('PostsService, notificaciones de retweet', () => {
  // Por destinatario y no por post: así también se ve una notificación que apunte al retweet.
  const notificationsFor = async (userId: string) => {
    await worker.processPending();
    return db
      .collection('notifications')
      .find({ to: new ObjectId(userId) })
      .toArray();
  };

  it('si guardar el evento falla, el retweet falla y ni se crea ni cambia el original', async () => {
    const seed = await seedOwnerWithPosts('txrt');

    await withEventInsertsFailing(() =>
      expect(
        service.toggleRetweet(seed.publicId, userViewer(seed.otherId)),
      ).rejects.toThrow(),
    );

    const retweets = await db
      .collection('posts')
      .find({ retweetOf: new ObjectId(seed.publicId) })
      .toArray();
    expect(retweets).toEqual([]);
    const original = await postById(seed.publicId);
    expect(original!.retweets).toEqual([]);
    expect(original!.retweetsCount).toBe(0);
  });

  it('el retweet de otro usuario crea una notificación para el autor del original', async () => {
    const seed = await seedOwnerWithPosts('notifrt');

    await service.toggleRetweet(seed.publicId, userViewer(seed.otherId));

    const notifications = await notificationsFor(seed.ownerId);
    expect(notifications).toHaveLength(1);
    expect(notifications[0]).toMatchObject({ type: 'retweet', read: false });
    expect(String(notifications[0]!.from)).toBe(seed.otherId);
    expect(String(notifications[0]!.postId)).toBe(seed.publicId);
  });

  it('con retweets apagado en los ajustes del autor, el retweet se hace pero no avisa', async () => {
    const seed = await seedOwnerWithPosts('notifrtoff');
    await db
      .collection('users')
      .updateOne(
        { _id: new ObjectId(seed.ownerId) },
        { $set: { 'preferences.notifications.retweets': false } },
      );

    const result = await service.toggleRetweet(
      seed.publicId,
      userViewer(seed.otherId),
    );

    expect(result).toMatchObject({ retweeted: true });
    await expect(notificationsFor(seed.ownerId)).resolves.toHaveLength(0);
  });

  it('quitar el retweet no crea otra notificación ni borra la existente', async () => {
    const seed = await seedOwnerWithPosts('notifrtundo');
    const viewer = userViewer(seed.otherId);

    await service.toggleRetweet(seed.publicId, viewer);
    await service.toggleRetweet(seed.publicId, viewer);

    await expect(notificationsFor(seed.ownerId)).resolves.toHaveLength(1);
  });

  it('el retweet del autor a su propio post no crea notificación', async () => {
    const seed = await seedOwnerWithPosts('notifrtown');

    await service.toggleRetweet(seed.publicId, userViewer(seed.ownerId));

    await expect(notificationsFor(seed.ownerId)).resolves.toHaveLength(0);
  });
});

describe('PostsService, like y guardado de un retweet van al original', () => {
  // B (owner) publica, C (other) retuitea y A (follower) actúa sobre el id del envoltorio.
  async function seedRetweet(prefix: string) {
    const seed = await seedOwnerWithPosts(prefix);
    await service.toggleRetweet(seed.publicId, userViewer(seed.otherId));
    const wrapper = await postsPersistence.findUserRetweet(
      seed.otherId,
      seed.publicId,
    );
    return { ...seed, wrapperId: wrapper!._id.toString() };
  }

  const postOf = (id: string) =>
    db.collection('posts').findOne({ _id: new ObjectId(id) });

  const notificationsOfType = async (userId: string, type: string) => {
    await worker.processPending();
    return db
      .collection('notifications')
      .find({ to: new ObjectId(userId), type })
      .toArray();
  };

  it('el like al envoltorio se guarda en el original y no en el envoltorio', async () => {
    const seed = await seedRetweet('rtlike');

    await service.toggleLike(seed.wrapperId, userViewer(seed.followerId));

    const original = await postOf(seed.publicId);
    expect(original!.likes.map(String)).toEqual([seed.followerId]);
    expect(original!.likesCount).toBe(1);
    const wrapper = await postOf(seed.wrapperId);
    expect(wrapper!.likes ?? []).toEqual([]);
    expect(wrapper!.likesCount).toBe(0);
  });

  it('el like al envoltorio avisa al autor del original y no a quien retuiteó', async () => {
    const seed = await seedRetweet('rtlikenoti');

    await service.toggleLike(seed.wrapperId, userViewer(seed.followerId));

    const forAuthor = await notificationsOfType(seed.ownerId, 'like');
    expect(forAuthor).toHaveLength(1);
    expect(String(forAuthor[0]!.from)).toBe(seed.followerId);
    expect(String(forAuthor[0]!.postId)).toBe(seed.publicId);
    await expect(
      notificationsOfType(seed.otherId, 'like'),
    ).resolves.toHaveLength(0);
  });

  it('guardar el envoltorio se guarda en el original y no en el envoltorio', async () => {
    const seed = await seedRetweet('rtbook');

    await service.toggleBookmark(seed.wrapperId, userViewer(seed.followerId));

    const original = await postOf(seed.publicId);
    expect(original!.bookmarks.map(String)).toEqual([seed.followerId]);
    expect(original!.bookmarksCount).toBe(1);
    const wrapper = await postOf(seed.wrapperId);
    expect(wrapper!.bookmarks ?? []).toEqual([]);
    expect(wrapper!.bookmarksCount).toBe(0);
  });

  it('guardar el envoltorio avisa al autor del original y no a quien retuiteó', async () => {
    const seed = await seedRetweet('rtbooknoti');

    await service.toggleBookmark(seed.wrapperId, userViewer(seed.followerId));

    const forAuthor = await notificationsOfType(seed.ownerId, 'bookmark');
    expect(forAuthor).toHaveLength(1);
    expect(String(forAuthor[0]!.from)).toBe(seed.followerId);
    expect(String(forAuthor[0]!.postId)).toBe(seed.publicId);
    await expect(
      notificationsOfType(seed.otherId, 'bookmark'),
    ).resolves.toHaveLength(0);
  });
});
