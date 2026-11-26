import {
  ARC_END_EXPERIENCE,
  EPISODE_TYPE_EXPERIENCE,
  EVENT_EXPERIENCE,
  SAGA_END_EXPERIENCE,
} from '@logpose/contracts/common/experience';
import { Box, Flex, Heading, Text } from '@radix-ui/themes';
import { useTranslation } from 'next-i18next/pages';

import { SERIE_REWARD_TYPES } from '@/features/serie/serie.constants';
import type { SerieArcTexts, SerieEpisode } from '@/features/serie/serie.types';

type SerieEpisodeRewardsProps = {
  episode: SerieEpisode;
  texts: SerieArcTexts;
};

export function SerieEpisodeRewards({
  episode,
  texts,
}: SerieEpisodeRewardsProps) {
  const { t } = useTranslation();
  const hasRewards = Object.values(episode.rewards).some(ids => ids.length > 0);

  return (
    <Box className="p-3">
      <Heading
        as="h5"
        size="1"
        mb="2"
        className="text-highlight decoration-highlight/40 underline"
      >
        {t('serie.rewards_heading')}
      </Heading>

      <Flex direction="column" gap="1" className="text-foreground/80">
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
              <Text key={key} as="p" size="1" className="text-foreground/80">
                <Text as="span" weight="medium" className="text-foreground">
                  {t(labelKey)}:
                </Text>{' '}
                {ids.join(', ')}
              </Text>
            );
          })}
        </Flex>
      ) : null}
    </Box>
  );
}
