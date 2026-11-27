import { Box, Flex, Heading } from '@radix-ui/themes';
import Link from 'next/link';
import { useTranslation } from 'next-i18next/pages';
import { Suspense, useId } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

import { QueryErrorFallback } from '@/components/error-boundary/query-error-fallback';
import { usePostsFeedInfinite } from '@/features/posts/api/use-posts';
import { PostCard } from '@/features/posts/ui/post-card.component';
import { PostFeedSkeleton } from '@/features/posts/ui/post-card-skeleton.component';
import { PostFeedEmpty } from '@/features/posts/ui/post-feed-empty.component';

function FollowingPosts() {
  const { t } = useTranslation();
  const { data } = usePostsFeedInfinite('following');
  const posts = data.pages.flatMap(page => page.posts).slice(0, 3);

  if (posts.length === 0) return <PostFeedEmpty feed="following" />;

  return (
    <Flex direction="column" align="start" gap="3">
      <Flex asChild direction="column" gap="3" className="w-full">
        <ul className="m-0 list-none p-0">
          {posts.map(post => (
            <li key={post._id}>
              <PostCard post={post} />
            </li>
          ))}
        </ul>
      </Flex>
      <Link
        href="/dashboard/community?feed=following"
        className="text-highlight/80 hover:text-highlight text-sm underline-offset-2 hover:underline"
      >
        {t('dashboard.pages.home.following_more')}
      </Link>
    </Flex>
  );
}

export function DashboardFollowingPosts() {
  const { t } = useTranslation();
  const headingId = useId();

  return (
    <Box asChild mt="8">
      <section aria-labelledby={headingId}>
        <Heading
          id={headingId}
          as="h2"
          size="6"
          mb="4"
          className="font-one-piece text-highlight"
        >
          {t('dashboard.pages.home.following_title')}
        </Heading>
        <ErrorBoundary FallbackComponent={QueryErrorFallback}>
          <Suspense fallback={<PostFeedSkeleton />}>
            <FollowingPosts />
          </Suspense>
        </ErrorBoundary>
      </section>
    </Box>
  );
}
