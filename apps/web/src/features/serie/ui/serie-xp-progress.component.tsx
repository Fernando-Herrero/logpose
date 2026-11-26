import { Flex, Progress, Text } from '@radix-ui/themes';
import { useTranslation } from 'next-i18next/pages';

import { useSerieTotalExperience } from '@/features/serie/api/use-serie';
import { getSerieXpPercent } from '@/features/serie/serie.selectors';

export function SerieXpProgress({ experience }: { experience: number }) {
  const { t } = useTranslation();
  const totalExperience = useSerieTotalExperience();

  return (
    <>
      <Flex align="center" justify="between" gap="3" mb="2">
        <Text as="p" size="1" className="text-foreground/70">
          {t('serie.progress_label')}
        </Text>
        <Text as="p" size="1" weight="medium" className="text-highlight">
          {experience.toLocaleString()} / {totalExperience.toLocaleString()} XP
        </Text>
      </Flex>
      <Progress
        aria-label={t('serie.progress_label')}
        value={getSerieXpPercent(experience, totalExperience)}
        size="2"
        className="profile-xp-progress h-2"
      />
    </>
  );
}
