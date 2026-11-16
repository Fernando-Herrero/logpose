import type { PostFeed } from '@logpose/contracts/features/posts/schemas';
import {
  useMutation,
  useQueryClient,
  useSuspenseInfiniteQuery,
} from '@tanstack/react-query';
import { useTranslation } from 'next-i18next/pages';
import { toast } from 'sonner';

import { getSessionUser } from '@/features/auth/api/session-user';
import { postsKeys } from '@/features/posts/api/posts.keys';
import {
  cancelPostPages,
  createOptimisticPost,
  invalidateProfilePostQueries,
  patchPostInCaches,
  prependPostToFeeds,
  removePostFromCaches,
  replacePostInCaches,
  revokeOptimisticImageUrls,
  togglePostInCaches,
} from '@/features/posts/api/posts-cache';
import { uploadPostImages } from '@/features/posts/api/upload-post-images';
import type { PostPublic } from '@/features/posts/posts.types';
import type { ProfilePostsTab } from '@/features/profile/profile.types';
import { client } from '@/integrations/orpc/orpc.client';
import { allQueriesOptions } from '@/integrations/tanstack-query/queries-options';

type CreatePostVariables = {
  text: string;
  files?: File[];
};

export type { CreatePostVariables };

export function usePostsFeedInfinite(feed: PostFeed) {
  return useSuspenseInfiniteQuery(allQueriesOptions.posts.feedInfinite(feed));
}

export function useCreatePostMutation() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ text, files }: CreatePostVariables) => {
      const images = files?.length ? await uploadPostImages(files) : undefined;
      return client.posts.create({ text, images });
    },
    onMutate: async body => {
      await queryClient.cancelQueries({ queryKey: postsKeys.feeds() });

      const user = getSessionUser(queryClient);

      if (user) {
        const optimisticImageUrls = body.files?.length
          ? body.files.map(file => URL.createObjectURL(file))
          : undefined;
        const optimisticPost = createOptimisticPost(
          user,
          body.text.trim(),
          optimisticImageUrls,
        );
        prependPostToFeeds(queryClient, optimisticPost);
        return {
          optimisticId: optimisticPost._id,
          optimisticImageUrls,
        };
      }

      return {
        optimisticId: null,
        optimisticImageUrls: undefined,
      };
    },
    onError: (_error, _body, context) => {
      revokeOptimisticImageUrls(context?.optimisticImageUrls);

      if (context?.optimisticId) {
        removePostFromCaches(queryClient, context.optimisticId);
      }

      toast.error(t('posts.create_error'));
    },
    onSuccess: (post, _body, context) => {
      revokeOptimisticImageUrls(context.optimisticImageUrls);

      if (context.optimisticId) {
        replacePostInCaches(queryClient, context.optimisticId, post);
      } else {
        prependPostToFeeds(queryClient, post);
      }

      const userId = getSessionUser(queryClient)?._id;
      if (userId) {
        invalidateProfilePostQueries(queryClient, userId, ['posts']);
      }

      toast.success(t('posts.create_success'));
    },
  });
}

export function useDeletePostMutation() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (postId: string) =>
      client.posts.delete({ params: { id: postId } }),
    onError: () => {
      toast.error(t('posts.delete_error'));
    },
    onSuccess: (_post, postId) => {
      removePostFromCaches(queryClient, postId);

      const userId = getSessionUser(queryClient)?._id;
      if (userId) {
        invalidateProfilePostQueries(queryClient, userId, [
          'posts',
          'liked',
          'bookmarked',
        ]);
      }

      toast.success(t('posts.delete_success'));
    },
  });
}

type ToggleFieldResult<
  BoolKey extends 'userLiked' | 'userBookmarked' | 'userRetweeted',
  CountKey extends 'likesCount' | 'bookmarksCount' | 'retweetsCount',
> = Record<BoolKey, boolean> & Record<CountKey, number>;

function useTogglePostFieldMutation<
  BoolKey extends 'userLiked' | 'userBookmarked' | 'userRetweeted',
  CountKey extends 'likesCount' | 'bookmarksCount' | 'retweetsCount',
  Result extends ToggleFieldResult<BoolKey, CountKey>,
>({
  mutationFn,
  boolKey,
  countKey,
  invalidateTab,
  invalidateFeed,
}: {
  mutationFn: (postId: string) => Promise<Result>;
  boolKey: BoolKey;
  countKey: CountKey;
  invalidateTab: ProfilePostsTab;
  invalidateFeed?: PostFeed;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onMutate: async (postId: string) => {
      await cancelPostPages(queryClient);
      return {
        previous: togglePostInCaches(queryClient, postId, boolKey, countKey),
      };
    },
    onError: (_error, postId, context) => {
      if (context?.previous) {
        patchPostInCaches(queryClient, postId, context.previous);
      }
    },
    onSuccess: (result, postId) => {
      patchPostInCaches(queryClient, postId, {
        [countKey]: result[countKey],
        [boolKey]: result[boolKey],
      } as Partial<PostPublic>);

      if (invalidateFeed) {
        void queryClient.invalidateQueries({
          queryKey: postsKeys.feed(invalidateFeed),
        });
      }

      const userId = getSessionUser(queryClient)?._id;
      if (userId) {
        invalidateProfilePostQueries(queryClient, userId, [invalidateTab]);
      }
    },
  });
}

export function useTogglePostLikeMutation() {
  return useTogglePostFieldMutation({
    mutationFn: (postId: string) =>
      client.posts.toggleLike({ params: { id: postId } }),
    boolKey: 'userLiked',
    countKey: 'likesCount',
    invalidateTab: 'liked',
  });
}

export function useTogglePostBookmarkMutation() {
  return useTogglePostFieldMutation({
    mutationFn: (postId: string) =>
      client.posts.toggleBookmark({ params: { id: postId } }),
    boolKey: 'userBookmarked',
    countKey: 'bookmarksCount',
    invalidateTab: 'bookmarked',
  });
}

export function useTogglePostRetweetMutation() {
  return useTogglePostFieldMutation({
    mutationFn: (postId: string) =>
      client.posts.toggleRetweet({ params: { id: postId } }),
    boolKey: 'userRetweeted',
    countKey: 'retweetsCount',
    invalidateTab: 'posts',
    // Retuitear cambia dónde sale el post en «Siguiendo»: lo coloca la API.
    invalidateFeed: 'following',
  });
}
