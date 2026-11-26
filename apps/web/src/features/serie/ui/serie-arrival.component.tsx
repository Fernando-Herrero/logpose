import { Box, Flex, Select, Text, TextField } from '@radix-ui/themes';
import { useTranslation } from 'next-i18next/pages';
import { useState } from 'react';

import {
  useSerieTotalEpisodes,
  useSuspenseSerieAllArcs,
} from '@/features/serie/api/use-serie';
import {
  getArcArrivalDate,
  getPendingEpisodes,
} from '@/features/serie/serie.selectors';
import { useLocale } from '@/integrations/next-i18next/use-locale';

export function SerieArrival({
  lastWatchedEpisode,
  skipFiller,
}: {
  lastWatchedEpisode: number;
  skipFiller: boolean;
}) {
  const { t } = useTranslation();
  const locale = useLocale();
  const { data } = useSuspenseSerieAllArcs();
  const totalEpisodes = useSerieTotalEpisodes();
  const [arcSlug, setArcSlug] = useState<string>();
  const [episodesPerDay, setEpisodesPerDay] = useState(3);

  const aheadArcs = data.arcs.filter(
    arc =>
      arc.firstEpisode > lastWatchedEpisode &&
      !(skipFiller && arc.type === 'filler'),
  );

  const arc = aheadArcs.find(item => item.slug === arcSlug) ?? aheadArcs[0];
  if (!arc) return null;

  const arcName = (slug: string) =>
    t(`arcs.${slug}.name`, { ns: 'serie', defaultValue: '' });
  const arrivalDate = getArcArrivalDate({
    episodesLeft: getPendingEpisodes({
      arcs: data.arcs,
      lastWatchedEpisode,
      totalEpisodes,
      skipFiller,
    }).filter(number => number < arc.firstEpisode).length,
    episodesPerDay,
    today: new Date(),
  });

  return (
    <Box mt="4">
      <Flex align="end" gap="2" wrap="wrap">
        <Text as="label" size="1" className="text-foreground/70">
          {t('serie.arrival_arc_label')}
          <Select.Root value={arc.slug} onValueChange={setArcSlug}>
            <Select.Trigger className="mt-1 flex" />
            <Select.Content position="popper">
              {aheadArcs.map(item => (
                <Select.Item key={item.slug} value={item.slug}>
                  {arcName(item.slug)}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
        </Text>
        <Text as="label" size="1" className="text-foreground/70">
          {t('serie.arrival_per_day_label')}
          <TextField.Root
            type="number"
            min={1}
            defaultValue={3}
            onChange={event =>
              setEpisodesPerDay(event.currentTarget.valueAsNumber)
            }
            className="mt-1 w-28"
          />
        </Text>
      </Flex>
      {arrivalDate && (
        <Text as="p" size="2" mt="2" className="text-highlight">
          {t('serie.arrival_result', {
            arc: arcName(arc.slug),
            date: new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(
              arrivalDate,
            ),
          })}
        </Text>
      )}
    </Box>
  );
}
