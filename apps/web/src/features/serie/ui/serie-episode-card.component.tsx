import {
  Badge,
  Box,
  Button,
  Card,
  Checkbox,
  Flex,
  Heading,
  Text,
  Tooltip,
} from '@radix-ui/themes';
import { useIsMutating } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next/pages';
import { useState } from 'react';

import { serieKeys } from '@/features/serie/api/serie.keys';
import { useSetProgressMutation } from '@/features/serie/api/use-serie';
import type { SerieArcTexts, SerieEpisode } from '@/features/serie/serie.types';
import { SerieEpisodeRewards } from '@/features/serie/ui/serie-episode-rewards.component';

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
              <Heading
                as="h4"
                size="2"
                weight="medium"
                className="text-foreground min-w-0"
              >
                {episodeTexts?.name}
              </Heading>
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
                    aria-label={`${t('serie.viewed_chapter')}: ${t('serie.episode_number', { number: episode.number })}`}
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
                aria-controls={`episode-${episode.number}-rewards`}
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
              <Box
                id={`episode-${episode.number}-rewards`}
                inert={!showRewards}
                className="faq-panel"
              >
                <Box className="faq-panel-inner">
                  <SerieEpisodeRewards episode={episode} texts={texts} />
                </Box>
              </Box>
            </Card>
          </Flex>
        </Card>
      </li>
    </Box>
  );
}
