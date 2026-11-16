import { oc } from '@orpc/contract';

import {
  createPostSchema,
  postPageSchema,
  postPublicSchema,
} from '../../common/post.schemas.js';
import {
  listPostsInputSchema,
  postIdParamsSchema,
  toggleBookmarkOutputSchema,
  toggleLikeOutputSchema,
  toggleRetweetOutputSchema,
} from './schemas.js';

export const postsErrors = {
  POST_NOT_FOUND: {
    status: 404,
    message: 'Post not found',
  },
} as const;

export const postsContract = oc
  .tag('Posts')
  .prefix('/posts')
  .router({
    list: oc
      .route({
        method: 'GET',
        path: '/',
        description:
          'List the "all" or "following" feed (cursor pagination); "following" requires a session',
      })
      .input(listPostsInputSchema)
      .errors(postsErrors)
      .output(postPageSchema),

    create: oc
      .route({
        method: 'POST',
        path: '/',
        description: 'Create a new post',
      })
      .input(createPostSchema)
      .errors(postsErrors)
      .output(postPublicSchema),

    delete: oc
      .route({
        method: 'DELETE',
        path: '/{id}',
        inputStructure: 'detailed',
        description: 'Soft-delete own post',
      })
      .input(postIdParamsSchema)
      .errors(postsErrors)
      .output(postPublicSchema),

    toggleLike: oc
      .route({
        method: 'POST',
        path: '/{id}/like',
        inputStructure: 'detailed',
        description: 'Toggle like on a post',
      })
      .input(postIdParamsSchema)
      .errors(postsErrors)
      .output(toggleLikeOutputSchema),

    toggleBookmark: oc
      .route({
        method: 'POST',
        path: '/{id}/bookmark',
        inputStructure: 'detailed',
        description: 'Toggle bookmark on a post',
      })
      .input(postIdParamsSchema)
      .errors(postsErrors)
      .output(toggleBookmarkOutputSchema),

    toggleRetweet: oc
      .route({
        method: 'POST',
        path: '/{id}/retweet',
        inputStructure: 'detailed',
        description: 'Toggle retweet on a post',
      })
      .input(postIdParamsSchema)
      .errors(postsErrors)
      .output(toggleRetweetOutputSchema),
  });
