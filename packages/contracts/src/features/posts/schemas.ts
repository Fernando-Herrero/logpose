import * as z from 'zod/v4';

import { mongoIdParamsSchema } from '../../common/id.schemas.js';
import { postPageQuerySchema } from '../../common/post.schemas.js';

export const postIdParamsSchema = mongoIdParamsSchema();

/** «Todos»: lo que el viewer puede ver, sin retweets. «Siguiendo»: lo suyo y lo de quien sigue, con lo que retuitean. */
export const postFeedSchema = z.enum(['all', 'following']);

export type PostFeed = z.infer<typeof postFeedSchema>;

export const listPostsInputSchema = postPageQuerySchema.extend({
  feed: postFeedSchema.default('all'),
});

export type ListPostsInput = z.infer<typeof listPostsInputSchema>;

export const toggleLikeOutputSchema = z.object({
  liked: z.boolean(),
  likesCount: z.number(),
  userLiked: z.boolean(),
});

export const toggleBookmarkOutputSchema = z.object({
  bookmarked: z.boolean(),
  bookmarksCount: z.number(),
  userBookmarked: z.boolean(),
});

export const toggleRetweetOutputSchema = z.object({
  retweeted: z.boolean(),
  retweetsCount: z.number(),
  userRetweeted: z.boolean(),
});
