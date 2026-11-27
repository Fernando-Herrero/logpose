import type { PostFeed } from '@logpose/contracts/features/posts/schemas';
import { Flex, Text } from '@radix-ui/themes';
import Link from 'next/link';
import { useTranslation } from 'next-i18next/pages';

export function PostFeedEmpty({ feed }: { feed: PostFeed }) {
  const { t } = useTranslation();

  return (
    <Flex direction="column" align="center" gap="2" className="py-12">
      <Text
        as="p"
        size="2"
        align="center"
        className="text-foreground/50 italic"
      >
        {t(feed === 'all' ? 'community.empty' : 'community.empty_following')}
      </Text>
      {feed === 'following' ? (
        <Link
          href="/dashboard/search"
          className="text-highlight/80 hover:text-highlight text-sm underline-offset-2 hover:underline"
        >
          {t('community.empty_following_link')}
        </Link>
      ) : null}
    </Flex>
  );
}
