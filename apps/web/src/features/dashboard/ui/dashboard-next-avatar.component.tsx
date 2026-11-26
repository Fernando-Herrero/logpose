import { avatarPreviewPath } from '@logpose/contracts/common/avatar';
import { Flex, Text } from '@radix-ui/themes';
import Image from 'next/image';
import { useTranslation } from 'next-i18next/pages';

import {
  useSerieTotalEpisodes,
  useSuspenseSerieAllArcs,
} from '@/features/serie/api/use-serie';
import { getNextAvatar } from '@/features/serie/serie.selectors';

export function DashboardNextAvatar({
  lastWatchedEpisode,
  skipFiller,
}: {
  lastWatchedEpisode: number;
  skipFiller: boolean;
}) {
  const { t } = useTranslation();
  const totalEpisodes = useSerieTotalEpisodes();
  const { data } = useSuspenseSerieAllArcs();
  const next = getNextAvatar({
    arcs: data.arcs,
    lastWatchedEpisode,
    totalEpisodes,
    skipFiller,
  });

  if (!next) return null;

  return (
    <Flex align="center" gap="3" mt="4">
      <Image
        src={avatarPreviewPath(next.id)}
        alt=""
        width={48}
        height={48}
        className="rounded-full"
      />
      <Text as="p" size="2">
        {t('dashboard.pages.home.next_avatar', {
          name: t(`avatar.characters.${next.id}`),
          count: next.remaining,
        })}
      </Text>
    </Flex>
  );
}
