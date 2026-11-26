import { Card, Flex, Heading, Skeleton, Text } from '@radix-ui/themes';
import { useTranslation } from 'next-i18next/pages';

import { useProfileStats } from '@/features/profile/api/use-profile';

type ProfileStatsCardProps = {
  userId: string;
};

export function ProfileStatsCard({ userId }: ProfileStatsCardProps) {
  const { t } = useTranslation();
  const { data } = useProfileStats(userId);

  const statItems = [
    { label: t('profile.stats_posts'), value: data.myPosts },
    { label: t('profile.liked_posts'), value: data.likedPosts },
    { label: t('profile.bookmarked_posts'), value: data.bookmarkedPosts },
    { label: t('profile.commented_posts'), value: data.commentedPosts },
    { label: t('profile.total_comments'), value: data.totalComments },
  ];

  return (
    <Card asChild className="card p-4">
      <section aria-labelledby="profile-stats-title">
        <Heading
          as="h2"
          id="profile-stats-title"
          size="3"
          mb="4"
          className="text-highlight"
        >
          {t('profile.stats_title')}
        </Heading>
        <Flex asChild direction="column" gap="2">
          <dl className="m-0">
            {statItems.map(item => (
              <Flex
                asChild
                key={item.label}
                align="center"
                justify="between"
                gap="3"
              >
                <div className="tile">
                  <Text asChild size="2" className="text-foreground/85">
                    <dt>{item.label}</dt>
                  </Text>
                  <Text
                    asChild
                    size="2"
                    weight="bold"
                    className="text-highlight"
                  >
                    <dd className="m-0">
                      {item.value ?? t('profile.stats_hidden')}
                    </dd>
                  </Text>
                </div>
              </Flex>
            ))}
          </dl>
        </Flex>
      </section>
    </Card>
  );
}

export function ProfileStatsCardSkeleton() {
  const { t } = useTranslation();

  return (
    <Card className="card p-4">
      <Heading as="h2" size="3" mb="4" className="text-highlight">
        {t('profile.stats_title')}
      </Heading>
      <Flex direction="column" gap="2">
        {Array.from({ length: 5 }, (_, index) => (
          <Flex
            key={index}
            align="center"
            justify="between"
            gap="3"
            className="tile"
          >
            <Skeleton height="16px" width="45%" />
            <Skeleton height="16px" width="32px" />
          </Flex>
        ))}
      </Flex>
    </Card>
  );
}
