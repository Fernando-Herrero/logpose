import {
  ARC_END_EXPERIENCE,
  EPISODE_TYPE_EXPERIENCE,
  EVENT_EXPERIENCE,
  SAGA_END_EXPERIENCE,
} from '@logpose/contracts/common/experience';
import {
  Badge,
  Box,
  Button,
  Card,
  Checkbox,
  Flex,
  Text,
  Tooltip,
} from '@radix-ui/themes';
import { useIsMutating } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next/pages';
import { useState } from 'react';

import { serieKeys } from '@/features/serie/api/serie.keys';
import { useSetProgressMutation } from '@/features/serie/api/use-serie';
import { SERIE_REWARD_TYPES } from '@/features/serie/serie.constants';
import type { SerieArcTexts, SerieEpisode } from '@/features/serie/serie.types';

type SerieEpisodeCardProps = {
  episode: SerieEpisode;
  texts: SerieArcTexts;
  watched: boolean;
  skipped: boolean;
};

export function SerieEpisodeCard({
  episode,
  texts,
  watched,
  skipped,
}: SerieEpisodeCardProps) {
  const { t } = useTranslation();
  const [showRewards, setShowRewards] = useState(false);
  const episodeTexts = texts.episodes[episode.number];
  const hasRewards = Object.values(episode.rewards).some(ids => ids.length > 0);
  const setProgress = useSetProgressMutation();
  const isSavingProgress =
    useIsMutating({ mutationKey: serieKeys.progress() }) > 0;

  return (
    <Box asChild>
      <li className={skipped ? 'opacity-50' : undefined}>
        <Card className="bg-deep/55 hover:border-highlight/25 hover:bg-deep/75 border border-white/10 p-3 shadow-sm transition-colors duration-300">
          <Flex direction="column" gap="2">
            <Flex align="start" gap="2">
              <Text
                as="p"
                size="1"
                weight="bold"
                className="font-road-captain text-highlight shrink-0"
              >
                {t('serie.episode_number', { number: episode.number })}
              </Text>
              <Text
                as="p"
                size="2"
                weight="medium"
                className="text-foreground min-w-0"
              >
                {episodeTexts?.name}
              </Text>
            </Flex>

            <Flex align="start" justify="between" gap="3">
              <Text
                as="p"
                size="1"
                className="text-foreground/75 min-w-0 flex-1"
              >
                {episodeTexts?.description}
              </Text>

              <Tooltip content={t('serie.viewed_chapter')}>
                <Box>
                  <Checkbox
                    checked={watched}
                    disabled={isSavingProgress}
                    aria-label={t('serie.viewed_chapter')}
                    onCheckedChange={() =>
                      setProgress.mutate(
                        watched ? episode.number - 1 : episode.number,
                      )
                    }
                  />
                </Box>
              </Tooltip>
            </Flex>

            <Flex align="center" wrap="wrap" gap="2">
              <Badge color="orange" variant="soft" size="1">
                {t('serie.episode_xp', { xp: episode.experience })}
              </Badge>
              <Button
                type="button"
                variant="ghost"
                size="1"
                highContrast
                aria-expanded={showRewards}
                className="text-highlight/80 hover:text-highlight h-auto cursor-pointer px-1"
                onClick={() => setShowRewards(open => !open)}
              >
                {showRewards
                  ? t('serie.hide_rewards')
                  : t('serie.show_rewards')}
              </Button>
            </Flex>

            <Card
              className="faq-item border-0 bg-black/25 p-0 shadow-none"
              data-open={showRewards || undefined}
            >
              <Box className="faq-panel">
                <Box className="faq-panel-inner">
                  <Box className="p-3">
                    <Text
                      as="p"
                      size="1"
                      weight="bold"
                      mb="2"
                      className="text-highlight decoration-highlight/40 underline"
                    >
                      {t('serie.rewards_heading')}
                    </Text>

                    <Flex
                      direction="column"
                      gap="1"
                      className="text-foreground/80"
                    >
                      <Text as="p" size="1">
                        {t(`serie.episode_type.${episode.type}`)} ·{' '}
                        {EPISODE_TYPE_EXPERIENCE[episode.type]}
                      </Text>
                      {episode.events.length > 0 ? (
                        <>
                          <Text as="p" size="1">
                            {t('serie.xp_events', {
                              count: episode.events.length,
                            })}{' '}
                            · +{EVENT_EXPERIENCE * episode.events.length}
                          </Text>
                          <ul className="m-0 list-disc pl-5">
                            {episode.events.map(slug => (
                              <Text
                                key={slug}
                                asChild
                                size="1"
                                className="text-foreground/70"
                              >
                                <li>{texts.events[slug]}</li>
                              </Text>
                            ))}
                          </ul>
                        </>
                      ) : null}
                      {episode.closesArc ? (
                        <Text as="p" size="1">
                          {t('serie.xp_closes_arc')} · +{ARC_END_EXPERIENCE}
                        </Text>
                      ) : null}
                      {episode.closesSaga ? (
                        <Text as="p" size="1">
                          {t('serie.xp_closes_saga')} · +{SAGA_END_EXPERIENCE}
                        </Text>
                      ) : null}
                    </Flex>

                    {hasRewards ? (
                      <Flex direction="column" gap="1" mt="2">
                        {SERIE_REWARD_TYPES.map(({ key, labelKey }) => {
                          const ids = episode.rewards[key];
                          if (!ids.length) {
                            return null;
                          }

                          return (
                            <Text
                              key={key}
                              as="p"
                              size="1"
                              className="text-foreground/80"
                            >
                              <Text
                                as="span"
                                weight="medium"
                                className="text-foreground"
                              >
                                {t(labelKey)}:
                              </Text>{' '}
                              {ids.join(', ')}
                            </Text>
                          );
                        })}
                      </Flex>
                    ) : null}
                  </Box>
                </Box>
              </Box>
            </Card>
          </Flex>
        </Card>
      </li>
    </Box>
  );
}
