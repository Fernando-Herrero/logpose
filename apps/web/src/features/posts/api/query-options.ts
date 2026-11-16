import {
  POST_FEED_PAGE_SIZE,
  type PostCursor,
} from '@logpose/contracts/common/post.schemas';
import type { PostFeed } from '@logpose/contracts/features/posts/schemas';
import { infiniteQueryOptions } from '@tanstack/react-query';

import { postsKeys } from '@/features/posts/api/posts.keys';
import type { OrpcClient } from '@/integrations/orpc/orpc.client';

export const getPostsQueriesOptions = (client: OrpcClient) => ({
  feedInfinite: (feed: PostFeed) =>
    infiniteQueryOptions({
      queryKey: postsKeys.feed(feed),
      queryFn: ({ pageParam }) =>
        client.posts.list({
          feed,
          limit: POST_FEED_PAGE_SIZE,
          cursor: pageParam,
        }),
      initialPageParam: undefined as PostCursor | undefined,
      getNextPageParam: lastPage => lastPage.nextCursor ?? undefined,
    }),
});
