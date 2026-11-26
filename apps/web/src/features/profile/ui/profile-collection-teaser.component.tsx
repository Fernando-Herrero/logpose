import { Card, Flex, Heading, Text } from '@radix-ui/themes';
import Link from 'next/link';
import { useTranslation } from 'next-i18next/pages';

import { PROFILE_UNLOCKED_CARD_KEYS } from '@/features/profile/profile.constants';
import type { ProfileUser } from '@/features/profile/profile.types';

type ProfileCollectionTeaserProps = {
  unlockedCards: ProfileUser['unlockedCards'];
  isOwner?: boolean;
};

export function ProfileCollectionTeaser({
  unlockedCards,
  isOwner = true,
}: ProfileCollectionTeaserProps) {
  const { t } = useTranslation();

  const totalUnlocked = PROFILE_UNLOCKED_CARD_KEYS.reduce(
    (sum, key) => sum + unlockedCards[key].length,
    0,
  );

  const breakdown = PROFILE_UNLOCKED_CARD_KEYS.map(key => ({
    key,
    count: unlockedCards[key].length,
    label: t(`profile.collection_${key}`),
  })).filter(item => item.count > 0);

  return (
    <Card asChild className="card p-4">
      <section aria-labelledby="profile-collection-title">
        <Flex align="center" justify="between" gap="3" mb="4">
          <Heading
            as="h2"
            id="profile-collection-title"
            size="3"
            className="text-highlight"
          >
            {t('profile.collection_title')}
          </Heading>
          {isOwner ? (
            <Link
              href="/dashboard/cards"
              className="text-highlight/80 hover:text-highlight text-xs underline-offset-2 transition hover:underline"
            >
              {t('profile.collection_view_all')}
            </Link>
          ) : null}
        </Flex>

        <Text as="p" size="2" mb="3" className="text-foreground/85">
          {t('profile.collection_total', { count: totalUnlocked })}
        </Text>

        {breakdown.length === 0 ? (
          <Text as="p" size="2" className="text-foreground/50 italic">
            {t(
              isOwner
                ? 'profile.collection_empty'
                : 'profile.collection_empty_other',
            )}
          </Text>
        ) : (
          <Flex asChild direction="column" gap="2">
            <dl className="m-0">
              {breakdown.map(item => (
                <Flex
                  asChild
                  key={item.key}
                  align="center"
                  justify="between"
                  gap="3"
                >
                  <div className="tile">
                    <Text asChild size="2" className="text-foreground/85">
                      <dt>{item.label}</dt>
                    </Text>
                    <Text
                      asChild
                      size="2"
                      weight="bold"
                      className="text-highlight"
                    >
                      <dd className="m-0">{item.count}</dd>
                    </Text>
                  </div>
                </Flex>
              ))}
            </dl>
          </Flex>
        )}
      </section>
    </Card>
  );
}
