import { Button, Flex, Text, TextField } from '@radix-ui/themes';
import { useTranslation } from 'next-i18next/pages';

import {
  useSerieTotalEpisodes,
  useSetProgressMutation,
} from '@/features/serie/api/use-serie';

export function SerieCatchUp({
  lastWatchedEpisode,
}: {
  lastWatchedEpisode: number;
}) {
  const { t } = useTranslation();
  const setProgress = useSetProgressMutation();
  const totalEpisodes = useSerieTotalEpisodes();

  return (
    <form
      className="mt-4"
      onSubmit={event => {
        event.preventDefault();
        setProgress.mutate(
          Number(new FormData(event.currentTarget).get('episode')),
        );
      }}
    >
      <Flex align="end" gap="2">
        <Text as="label" size="1" className="text-foreground/70">
          {t('serie.catch_up_label')}
          <TextField.Root
            key={lastWatchedEpisode}
            name="episode"
            type="number"
            min={0}
            max={totalEpisodes}
            defaultValue={lastWatchedEpisode}
            required
            className="mt-1 w-28"
          />
        </Text>
        <Button type="submit" loading={setProgress.isPending}>
          {t('serie.catch_up_submit')}
        </Button>
      </Flex>
    </form>
  );
}
