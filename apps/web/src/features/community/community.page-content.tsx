import type { PostFeed } from '@logpose/contracts/features/posts/schemas';
import {
  Box,
  Button,
  Flex,
  Heading,
  SegmentedControl,
  Text,
} from '@radix-ui/themes';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next/pages';
import { Suspense, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

import { QueryErrorFallback } from '@/components/error-boundary/query-error-fallback';
import {
  useCreatePostMutation,
  useDeletePostMutation,
  usePostsFeedInfinite,
} from '@/features/posts/api/use-posts';
import { CreatePostFab } from '@/features/posts/ui/create-post-fab.component';
import { CreatePostModal } from '@/features/posts/ui/create-post-modal.component';
import { PostCard } from '@/features/posts/ui/post-card.component';
import { PostFeedSkeleton } from '@/features/posts/ui/post-card-skeleton.component';
import { PostFeedEmpty } from '@/features/posts/ui/post-feed-empty.component';

function CommunityFeed({
  feed,
  onDeletePost,
  deletingPostId,
}: {
  feed: PostFeed;
  onDeletePost: (postId: string) => void;
  deletingPostId?: string;
}) {
  const { t } = useTranslation();
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    usePostsFeedInfinite(feed);
  const posts = data.pages.flatMap(page => page.posts);

  if (posts.length === 0) return <PostFeedEmpty feed={feed} />;

  return (
    <Flex direction="column" gap="3">
      <Flex asChild direction="column" gap="3">
        <ul className="m-0 list-none p-0">
          {posts.map(post => (
            <li key={post._id}>
              <PostCard
                post={post}
                onDeletePost={onDeletePost}
                isDeleting={deletingPostId === (post.retweetOf ?? post._id)}
              />
            </li>
          ))}
        </ul>
      </Flex>

      {hasNextPage ? (
        <Flex justify="center" pt="2">
          <Button
            type="button"
            variant="soft"
            color="gray"
            highContrast
            disabled={isFetchingNextPage}
            className="cursor-pointer"
            onClick={() => void fetchNextPage()}
          >
            {isFetchingNextPage
              ? t('community.load_more_pending')
              : t('community.load_more')}
          </Button>
        </Flex>
      ) : null}
    </Flex>
  );
}

export default function CommunityPageContent() {
  const { t } = useTranslation();
  const router = useRouter();
  const feed: PostFeed =
    router.query.feed === 'following' ? 'following' : 'all';
  const [createOpen, setCreateOpen] = useState(false);
  const createPost = useCreatePostMutation();
  const deletePost = useDeletePostMutation();

  return (
    <Box className="relative mx-auto max-w-2xl pb-24">
      <Heading
        as="h1"
        size="6"
        mb="2"
        className="font-one-piece text-highlight tracking-wide"
      >
        {t('community.title')}
      </Heading>
      <Text as="p" size="2" color="gray" mb="4" className="text-foreground/75">
        {t('community.subtitle')}
      </Text>

      <SegmentedControl.Root
        aria-label={t('community.feed_label')}
        size="2"
        value={feed}
        onValueChange={value =>
          void router.replace(
            { query: value === 'following' ? { feed: value } : {} },
            undefined,
            { shallow: true },
          )
        }
        className="border-highlight/15 mb-6 w-full border"
      >
        <SegmentedControl.Item value="all">
          {t('community.feed_all')}
        </SegmentedControl.Item>
        <SegmentedControl.Item value="following">
          {t('community.feed_following')}
        </SegmentedControl.Item>
      </SegmentedControl.Root>

      <ErrorBoundary key={feed} FallbackComponent={QueryErrorFallback}>
        <Suspense fallback={<PostFeedSkeleton />}>
          <CommunityFeed
            feed={feed}
            onDeletePost={postId => deletePost.mutate(postId)}
            deletingPostId={
              deletePost.isPending ? deletePost.variables : undefined
            }
          />
        </Suspense>
      </ErrorBoundary>

      <CreatePostFab onClick={() => setCreateOpen(true)} />
      <CreatePostModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onPublish={payload => createPost.mutate(payload)}
      />
    </Box>
  );
}
