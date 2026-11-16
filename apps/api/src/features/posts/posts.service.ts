import { randomUUID } from 'node:crypto';

import { MongoTransactionService } from '@jperezmart/nest-mongodb';
import {
  type createPostSchema,
  getPostTextMaxLength,
  type PostPageQuery,
} from '@logpose/contracts/common/post.schemas';
import type { ListPostsInput } from '@logpose/contracts/features/posts/schemas';
import { Injectable } from '@nestjs/common';
import { ORPCError } from '@orpc/server';
import { type ClientSession, type Filter, ObjectId } from 'mongodb';
import type * as z from 'zod/v4';

import {
  accessTo,
  type UserViewer,
  type Viewer,
  visiblePostsFilter,
} from '../auth/access.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { withPreferenceDefaults } from '../users/user.mappers.js';
import { UsersPersistence } from '../users/users.persistence.js';
import {
  type PostDocument,
  serializePost,
  serializePostsForViewer,
} from './posts.mappers.js';
import { PostsPersistence } from './posts.persistence.js';

type CreatePostBody = z.infer<typeof createPostSchema>;

@Injectable()
export class PostsService {
  constructor(
    private readonly postsPersistence: PostsPersistence,
    private readonly usersPersistence: UsersPersistence,
    private readonly notificationsService: NotificationsService,
    private readonly transactions: MongoTransactionService,
  ) {}

  async list({ feed, ...query }: ListPostsInput, viewer: Viewer) {
    const visible = await visiblePostsFilter(viewer, this.usersPersistence);
    const page =
      feed === 'all'
        ? await this.postsPersistence.findPage(
            { isRetweet: false },
            visible,
            query,
          )
        : await this.findFollowingPage(viewer, visible, query);

    return {
      ...page,
      posts: await serializePostsForViewer(page.posts, viewer, visible, {
        posts: this.postsPersistence,
        users: this.usersPersistence,
      }),
    };
  }

  /** Lo del viewer y lo de quien sigue; los retweets, según su ajuste. */
  private async findFollowingPage(
    viewer: Viewer,
    visible: Filter<PostDocument>,
    query: PostPageQuery,
  ) {
    const user =
      viewer.kind === 'user'
        ? await this.usersPersistence.findById(viewer.id)
        : null;

    if (!user) {
      throw new ORPCError('UNAUTHORIZED');
    }

    return this.postsPersistence.findPageOncePerPost(
      {
        userId: { $in: [user._id, ...user.following] },
        ...(withPreferenceDefaults(user.preferences).timeline.showRetweets
          ? {}
          : { isRetweet: false }),
      },
      visible,
      query,
    );
  }

  /**
   * Bloquea al viewer en `session` frente al borrado de su cuenta: si se
   * cruzan, una de las dos transacciones choca y se repite.
   */
  private async lockViewer(viewer: UserViewer, session: ClientSession) {
    const user = await this.usersPersistence.lockActive(viewer.id, session);

    if (!user) {
      throw new ORPCError('UNAUTHORIZED');
    }

    return user;
  }

  create(viewer: UserViewer, body: CreatePostBody) {
    return this.transactions.withTransaction(async session => {
      const user = await this.lockViewer(viewer, session);

      if (body.text.length > getPostTextMaxLength(user.verified)) {
        throw new ORPCError('FORBIDDEN');
      }

      const post = await this.postsPersistence.insert(
        {
          text: body.text.trim(),
          userId: new ObjectId(viewer.id),
          images: body.images,
          visibility: body.visibility ?? 'public',
          shareToken: randomUUID(),
          language: 'es',
        },
        session,
      );

      return serializePost(post, user, viewer);
    });
  }

  async toggleLike(postId: string, viewer: UserViewer) {
    const { active, post } = await this.toggleField(postId, viewer, 'likes');

    return {
      liked: active,
      likesCount: Math.max(0, post.likesCount),
      userLiked: active,
    };
  }

  async toggleBookmark(postId: string, viewer: UserViewer) {
    const { active, post } = await this.toggleField(
      postId,
      viewer,
      'bookmarks',
    );

    return {
      bookmarked: active,
      bookmarksCount: Math.max(0, post.bookmarksCount),
      userBookmarked: active,
    };
  }

  /** Like y guardado: el mismo toggle transaccional y la misma notificación al añadir. */
  private async toggleField(
    postId: string,
    viewer: UserViewer,
    field: 'likes' | 'bookmarks',
  ) {
    const visible = await visiblePostsFilter(viewer, this.usersPersistence);
    // Un retweet enseña las interacciones de su original (ADR 0011): van a él.
    const post = await this.postsPersistence.findVisibleById(postId, visible);
    const targetId = post?.retweetOf?.toString() ?? postId;

    // La acción y su evento de notificación se guardan juntos o no se guarda nada.
    return this.transactions.withTransaction(async session => {
      await this.lockViewer(viewer, session);
      const result = await this.postsPersistence.toggleUserField(
        targetId,
        viewer.id,
        field,
        visible,
        session,
      );

      if (!result) {
        throw new ORPCError('POST_NOT_FOUND');
      }

      const active = !result.alreadyHad;

      if (active) {
        await this.notificationsService.notify(
          {
            type: field === 'likes' ? 'like' : 'bookmark',
            to: result.post.userId.toString(),
            from: viewer.id,
            postId: targetId,
          },
          session,
        );
      }

      return { active, post: result.post };
    });
  }

  async toggleRetweet(postId: string, viewer: UserViewer) {
    const visible = await visiblePostsFilter(viewer, this.usersPersistence);
    const original = await this.postsPersistence.findVisibleById(
      postId,
      visible,
    );

    if (!original) {
      throw new ORPCError('POST_NOT_FOUND');
    }

    // El retweet es un post público con el texto del original: solo de lo público.
    if (original.isRetweet || original.visibility !== 'public') {
      throw new ORPCError('FORBIDDEN');
    }

    const { original: updated, retweeted } =
      await this.transactions.withTransaction(async session => {
        await this.lockViewer(viewer, session);
        const toggled = await this.postsPersistence.toggleRetweet(
          postId,
          viewer.id,
          session,
        );

        if (!toggled) {
          throw new ORPCError('POST_NOT_FOUND');
        }

        if (toggled.retweeted) {
          await this.notificationsService.notify(
            {
              type: 'retweet',
              to: original.userId.toString(),
              from: viewer.id,
              postId,
            },
            session,
          );
        }

        return toggled;
      });

    return {
      retweeted,
      retweetsCount: Math.max(0, updated.retweetsCount),
      userRetweeted: retweeted,
    };
  }

  async delete(postId: string, viewer: UserViewer) {
    const visible = await visiblePostsFilter(viewer, this.usersPersistence);
    const post = await this.postsPersistence.findVisibleById(postId, visible);

    if (!post) {
      throw new ORPCError('POST_NOT_FOUND');
    }

    if (accessTo(viewer, post.userId.toString()) !== 'full') {
      throw new ORPCError('FORBIDDEN');
    }

    const deleted = await this.transactions.withTransaction(async session => {
      return this.postsPersistence.softDeleteById(postId, session);
    });

    if (!deleted) {
      throw new ORPCError('POST_NOT_FOUND');
    }

    const [serialized] = await serializePostsForViewer(
      [deleted],
      viewer,
      visible,
      { posts: this.postsPersistence, users: this.usersPersistence },
    );

    // Un retweet solo envuelve un original público y vivo (`toggleRetweet` y la
    // cascada de `softDeleteById`), así que nunca se descarta.
    return serialized!;
  }
}
