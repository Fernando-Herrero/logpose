import {
  experienceForLevel,
  levelFromExperience,
} from '@logpose/contracts/common/level';
import { Box, Flex, Progress, Text } from '@radix-ui/themes';
import { useTranslation } from 'next-i18next/pages';

export function DashboardLevelProgress({ experience }: { experience: number }) {
  const { t } = useTranslation();
  const level = levelFromExperience(experience);
  const floor = experienceForLevel(level);
  const next = experienceForLevel(level + 1);

  return (
    <Box className="mt-8 max-w-md">
      <Flex align="center" justify="between" gap="3" mb="2">
        <Text as="p" size="2" weight="bold" className="text-highlight">
          {t('dashboard.pages.home.level', { level })}
        </Text>
        <Text as="p" size="1" className="text-foreground/70">
          {t('dashboard.pages.home.level_remaining', {
            xp: (next - experience).toLocaleString(),
            next: level + 1,
          })}
        </Text>
      </Flex>
      <Progress
        aria-label={t('dashboard.pages.home.level', { level })}
        value={((experience - floor) / (next - floor)) * 100}
        size="2"
        className="profile-xp-progress h-2"
      />
    </Box>
  );
}
