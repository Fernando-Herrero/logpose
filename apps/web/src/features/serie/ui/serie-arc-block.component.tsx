import { Badge, Box, Flex, Spinner, Text } from '@radix-ui/themes';
import { useTranslation } from 'next-i18next/pages';

import {
  useSerieArcTexts,
  useSerieEpisodes,
} from '@/features/serie/api/use-serie';
import type { SerieArc } from '@/features/serie/serie.types';
import { SerieAccordion } from '@/features/serie/ui/serie-accordion.component';
import { SerieEpisodeCard } from '@/features/serie/ui/serie-episode-card.component';

type SerieArcBlockProps = {
  arc: SerieArc;
  isOpen: boolean;
  onToggle: () => void;
  lastWatchedEpisode: number;
  skipFiller: boolean;
};

export function SerieArcBlock({
  arc,
  isOpen,
  onToggle,
  lastWatchedEpisode,
  skipFiller,
}: SerieArcBlockProps) {
  const { t } = useTranslation(['common', 'serie']);
  const episodesQuery = useSerieEpisodes(arc.slug, { enabled: isOpen });
  const textsQuery = useSerieArcTexts(arc.slug, { enabled: isOpen });
  const isError = episodesQuery.isError || textsQuery.isError;
  const texts = textsQuery.data;
  const episodes = texts && episodesQuery.data?.episodes;
  // Un arco de relleno ya va atenuado entero: sus episodios no se atenúan otra vez.
  const arcSkipped = skipFiller && arc.type === 'filler';

  return (
    <Box className={arcSkipped ? 'opacity-50' : undefined}>
      <SerieAccordion
        variant="arc"
        title={t(`arcs.${arc.slug}.name`, { ns: 'serie', defaultValue: '' })}
        subtitle={t(`arcs.${arc.slug}.description`, {
          ns: 'serie',
          defaultValue: '',
        })}
        meta={t('serie.arc_meta', { episodes: arc.totalEpisodes })}
        isOpen={isOpen}
        onToggle={onToggle}
      >
        {arc.type === 'filler' ? (
          <Badge color="orange" variant="soft" size="1">
            {t('serie.filler')}
          </Badge>
        ) : null}

        {isOpen &&
        (episodesQuery.isPending || textsQuery.isPending) &&
        !isError ? (
          <Flex align="center" gap="2" py="2">
            <Spinner size="2" />
            <Text size="1" color="gray">
              {t('serie.loading')}
            </Text>
          </Flex>
        ) : null}

        {isOpen && isError ? (
          <Text size="1" color="red">
            {t('serie.error')}
          </Text>
        ) : null}

        {isOpen && episodes?.length === 0 ? (
          <Text size="1" color="gray">
            {t('serie.no_episodes')}
          </Text>
        ) : null}

        {isOpen && texts && episodes && episodes.length > 0 ? (
          <Box asChild>
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {episodes.map(episode => (
                <SerieEpisodeCard
                  key={episode.number}
                  episode={episode}
                  texts={texts}
                  watched={episode.number <= lastWatchedEpisode}
                  skipped={
                    skipFiller &&
                    !arcSkipped &&
                    (episode.type === 'filler' || episode.type === 'recap')
                  }
                />
              ))}
            </ul>
          </Box>
        ) : null}
      </SerieAccordion>
    </Box>
  );
}
