import { Flex, Switch, Text } from '@radix-ui/themes';
import { useTranslation } from 'next-i18next/pages';

import { SettingsPageShell } from '@/features/settings/settings-page-shell.component';
import { useSettingsPreferences } from '@/features/settings/use-settings-preferences';

/**
 * Cada clave corresponde a un `NotificationType` del módulo Nest de
 * notificaciones, para que apagar una aquí signifique algo en el servidor.
 */
const NOTIFICATION_TOGGLES = [
  { key: 'likes', labelKey: 'settings.notifications.likes' },
  { key: 'comments', labelKey: 'settings.notifications.comments' },
  { key: 'follows', labelKey: 'settings.notifications.follows' },
  { key: 'bookmarks', labelKey: 'settings.notifications.bookmarks' },
  { key: 'retweets', labelKey: 'settings.notifications.retweets' },
] as const;

export default function SettingsNotificationsPageContent() {
  const { t } = useTranslation();
  const { preferences, savePreference, isSaving } = useSettingsPreferences();

  if (!preferences) {
    return null;
  }

  return (
    <SettingsPageShell
      titleKey="settings.title_notifications"
      descriptionKey="settings.notifications.description"
    >
      <Flex asChild direction="column" gap="4">
        <ul className="m-0 list-none p-0">
          {NOTIFICATION_TOGGLES.map(toggle => (
            <Flex
              asChild
              key={toggle.key}
              align="center"
              justify="between"
              gap="4"
            >
              <li>
                <Text
                  as="label"
                  htmlFor={toggle.key}
                  size="2"
                  className="text-foreground/85"
                >
                  {t(toggle.labelKey)}
                </Text>
                <Switch
                  id={toggle.key}
                  checked={preferences.notifications[toggle.key]}
                  disabled={isSaving}
                  onCheckedChange={checked =>
                    savePreference('notifications', { [toggle.key]: checked })
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
