import {
  Card,
  Flex,
  Heading,
  Progress,
  Skeleton,
  Text,
} from '@radix-ui/themes';
import Link from 'next/link';
import { useTranslation } from 'next-i18next/pages';
import { Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

import { QueryErrorFallback } from '@/components/error-boundary/query-error-fallback';
import type { ProfileUser } from '@/features/profile/profile.types';
import { useSerieTotalExperience } from '@/features/serie/api/use-serie';
import { getSerieXpPercent } from '@/features/serie/serie.selectors';

type ProfileProgressCardProps = {
  user: ProfileUser;
  isOwner?: boolean;
};

function ProfileXpProgress({ experience }: { experience: number }) {
  const { t } = useTranslation();
  const totalExperience = useSerieTotalExperience();

  return (
    <Flex direction="column" gap="2">
      <Flex align="center" justify="between" gap="3">
        <Text as="span" size="2" className="text-foreground/85">
          {t('profile.progress_xp_label')}
        </Text>
        <Text as="span" size="2" weight="bold" className="text-highlight">
          {t('profile.experience', { value: experience })}
        </Text>
      </Flex>
      <Progress
        value={getSerieXpPercent(experience, totalExperience)}
        size="2"
        className="profile-xp-progress"
      />
      <Text as="p" size="1" color="gray" align="right">
        {t('profile.progress_xp_of_total', {
          current: experience,
          total: totalExperience,
        })}
      </Text>
    </Flex>
  );
}

export function ProfileProgressCard({
  user,
  isOwner = true,
}: ProfileProgressCardProps) {
  const { t } = useTranslation();

  return (
    <Card className="card p-4">
      <Flex align="center" justify="between" gap="3" mb="4">
        <Heading as="h2" size="3" className="text-highlight">
          {t('profile.progress_card_title')}
        </Heading>
        {isOwner ? (
          <Link
            href="/dashboard/serie"
            className="text-highlight/80 hover:text-highlight text-xs underline-offset-2 transition hover:underline"
          >
            {t('profile.progress_view_serie')}
          </Link>
        ) : null}
      </Flex>

      {user.lastWatchedEpisode > 0 ? (
        <Flex direction="column" gap="3">
          <Flex direction="column" gap="1" className="tile">
            <Text as="span" size="1" color="gray">
              {t('profile.progress_episode_label')}
            </Text>
            <Text
              as="span"
              size="2"
              weight="medium"
              className="text-foreground"
            >
              {t('serie.episode_number', { number: user.lastWatchedEpisode })}
            </Text>
          </Flex>

          <ErrorBoundary FallbackComponent={QueryErrorFallback}>
            <Suspense fallback={<Skeleton height="64px" />}>
              <ProfileXpProgress experience={user.experience} />
            </Suspense>
          </ErrorBoundary>
        </Flex>
      ) : (
        <Text as="p" size="2" className="text-foreground/50 italic">
          {t(
            isOwner ? 'profile.progress_empty' : 'profile.progress_empty_other',
          )}
        </Text>
      )}
    </Card>
  );
}
