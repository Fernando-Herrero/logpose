import type { PostFeed } from '@logpose/contracts/features/posts/schemas';

export const postsKeys = {
  all: ['posts'] as const,
  feeds: () => [...postsKeys.all, 'feed'] as const,
  feed: (feed: PostFeed) => [...postsKeys.feeds(), feed] as const,
};
