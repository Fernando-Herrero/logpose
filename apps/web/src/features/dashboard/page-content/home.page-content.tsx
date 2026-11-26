import {
  Box,
  Button,
  Card,
  Flex,
  Heading,
  Progress,
  Skeleton,
  Text,
} from '@radix-ui/themes';
import { useSuspenseQueries, useSuspenseQuery } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next/pages';
import { Suspense, useId } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

import { QueryErrorFallback } from '@/components/error-boundary/query-error-fallback';
import { MapHeader } from '@/components/map-header/map-header.component';
import { useAuthSession } from '@/features/auth/api/use-auth';
import {
  useSerieTotalEpisodes,
  useSetProgressMutation,
  useSuspenseSerieAllArcs,
} from '@/features/serie/api/use-serie';
import { getNextStop } from '@/features/serie/serie.selectors';
import { useLocale } from '@/integrations/next-i18next/use-locale';
import { allQueriesOptions } from '@/integrations/tanstack-query/queries-options';

function NextEpisode({
  number,
  compass,
}: {
  number: number;
  compass: { arcSlug: string; remaining: number } | undefined;
}) {
  const { t } = useTranslation();
  const locale = useLocale();
  const setProgress = useSetProgressMutation();
  const { data: episode } = useSuspenseQuery(
    allQueriesOptions.serie.episode(number),
  );
  const [{ data: texts }, { data: arc }] = useSuspenseQueries({
    queries: [
      allQueriesOptions.serie.arcTexts(episode.arcSlug, locale),
      allQueriesOptions.serie.episodesByArc(episode.arcSlug),
    ],
  });
  const watched = arc.episodes.filter(ep => ep.number < number).length;

  return (
    <>
      <Text
        as="p"
        size="1"
        weight="bold"
        className="font-road-captain text-highlight"
      >
        {t('serie.episode_number', { number })} ·{' '}
        {t('serie.episode_xp', { xp: episode.experience })}
      </Text>
      <Heading as="h3" size="5" mt="1">
        {texts.episodes[number]?.name}
      </Heading>
      <Text as="p" size="2" mt="2" className="text-foreground/75">
        {texts.episodes[number]?.description}
      </Text>
      <Flex align="center" justify="between" gap="3" mt="4" mb="2">
        <Text as="p" size="1" weight="medium">
          {texts.name}
        </Text>
        <Text as="p" size="1" className="text-foreground/70">
          {t('serie.next_arc_progress', { watched, total: arc.total })}
        </Text>
      </Flex>
      <Progress
        aria-label={texts.name}
        value={(watched / arc.total) * 100}
        size="2"
        className="profile-xp-progress h-2"
      />
      {compass && <ArcCompass {...compass} />}
      <Button
        size="3"
        mt="4"
        loading={setProgress.isPending}
        onClick={() => setProgress.mutate(number)}
      >
        {t('serie.next_mark_watched')}
      </Button>
    </>
  );
}

function ArcCompass({
  arcSlug,
  remaining,
}: {
  arcSlug: string;
  remaining: number;
}) {
  const { t } = useTranslation();
  const locale = useLocale();
  const { data: texts } = useSuspenseQuery(
    allQueriesOptions.serie.arcTexts(arcSlug, locale),
  );

  return (
    <Flex align="center" gap="3" mt="4">
      <svg
        viewBox="0 0 48 48"
        aria-hidden
        className="text-highlight size-12 shrink-0"
      >
        <circle
          cx="24"
          cy="24"
          r="21"
          fill="none"
          stroke="currentColor"
          strokeOpacity={0.4}
          strokeWidth="2"
        />
        <g transform="rotate(35 24 24)">
          <g className="origin-center transform-fill md:motion-safe:animate-[logpose-sway_3s_ease-in-out_infinite]">
            <path d="M24 7 28 24H20Z" fill="currentColor" />
            <path d="M20 24H28L24 41Z" fill="currentColor" fillOpacity={0.35} />
          </g>
        </g>
      </svg>
      <div>
        <Text as="p" size="2" weight="medium">
          {t('serie.next_arc_heading', { arc: texts.name })}
        </Text>
        <Text as="p" size="1" className="text-foreground/70">
          {t('serie.next_arc_remaining', { count: remaining })}
        </Text>
      </div>
    </Flex>
  );
}

function HomeNextEpisode({
  lastWatchedEpisode,
  skipFiller,
}: {
  lastWatchedEpisode: number;
  skipFiller: boolean;
}) {
  const { t } = useTranslation();
  const totalEpisodes = useSerieTotalEpisodes();
  const { data } = useSuspenseSerieAllArcs();
  const stop = getNextStop({
    arcs: data.arcs,
    lastWatchedEpisode,
    totalEpisodes,
    skipFiller,
  });

  return stop ? (
    <NextEpisode number={stop.episode} compass={stop.compass} />
  ) : (
    <Text as="p" size="2">
      {t('serie.next_up_to_date')}
    </Text>
  );
}

export default function HomePageContent() {
  const { t } = useTranslation();
  const { user } = useAuthSession();
  const headingId = useId();

  return (
    <Box className="mx-auto max-w-3xl lg:max-w-4xl">
      <MapHeader title={t('dashboard.pages.home.title')} />
      <Card asChild className="card p-6">
        <section aria-labelledby={headingId}>
          <Heading
            id={headingId}
            as="h2"
            size="6"
            mb="4"
            className="font-one-piece text-highlight"
          >
            {t('serie.next_title')}
          </Heading>
          <ErrorBoundary FallbackComponent={QueryErrorFallback}>
            <Suspense fallback={<Skeleton height="140px" />}>
              <HomeNextEpisode
                lastWatchedEpisode={user?.lastWatchedEpisode ?? 0}
                skipFiller={user?.preferences.serie.skipFiller ?? false}
              />
            </Suspense>
          </ErrorBoundary>
        </section>
      </Card>
    </Box>
  );
}
