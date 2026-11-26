import { Flex, Heading, Switch, Text } from '@radix-ui/themes';
import { useTranslation } from 'next-i18next/pages';
import { toast } from 'sonner';

import { useAuthSession } from '@/features/auth/api/use-auth';
import { useUpdateProfileMutation } from '@/features/profile/api/use-profile';
import { PROFILE_POSTS_TAB_CONFIG } from '@/features/profile/profile.constants';
import type { ProfilePrivacy } from '@/features/profile/profile.types';
import { SettingsPageShell } from '@/features/settings/settings-page-shell.component';

export default function SettingsPrivacyPageContent() {
  const { t } = useTranslation();
  const { user } = useAuthSession();
  const updateProfile = useUpdateProfileMutation();

  if (!user) {
    return null;
  }

  const sessionUser = user;

  async function handlePrivacyChange(
    key: keyof ProfilePrivacy,
    checked: boolean,
  ) {
    try {
      await updateProfile.mutateAsync({
        userId: sessionUser._id,
        body: {
          privacy: {
            ...sessionUser.privacy,
            [key]: checked,
          },
        },
      });
      toast.success(t('settings.privacy.save_success'));
    } catch {
      toast.error(t('settings.privacy.save_error'));
    }
  }

  return (
    <SettingsPageShell
      titleKey="settings.title_privacy"
      descriptionKey="settings.privacy.description"
    >
      <Heading
        as="h2"
        size="3"
        weight="medium"
        mb="4"
        className="text-highlight/90"
      >
        {t('settings.privacy.title')}
      </Heading>
      <Flex asChild direction="column" gap="4">
        <ul className="m-0 list-none p-0">
          {PROFILE_POSTS_TAB_CONFIG.map(tab => (
            <Flex
              asChild
              key={tab.privacyKey}
              align="center"
              justify="between"
              gap="4"
            >
              <li>
                <Text
                  as="label"
                  htmlFor={tab.privacyKey}
                  size="2"
                  className="text-foreground/85"
                >
                  {t(tab.labelKey)}
                </Text>
                <Switch
                  id={tab.privacyKey}
                  checked={sessionUser.privacy[tab.privacyKey]}
                  disabled={updateProfile.isPending}
                  onCheckedChange={checked =>
                    handlePrivacyChange(tab.privacyKey, checked)
                  }
                />
              </li>
            </Flex>
          ))}
        </ul>
      </Flex>
    </SettingsPageShell>
  );
}
