import { Flex, Switch, Text } from '@radix-ui/themes';
import { useTranslation } from 'next-i18next/pages';

import { SettingsPageShell } from '@/features/settings/settings-page-shell.component';
import { useSettingsPreferences } from '@/features/settings/use-settings-preferences';

const TIMELINE_TOGGLES = [
  {
    key: 'showRetweets',
    labelKey: 'settings.timeline.show_retweets',
    hintKey: 'settings.timeline.show_retweets_hint',
  },
  {
    key: 'compactMode',
    labelKey: 'settings.timeline.compact_mode',
    hintKey: 'settings.timeline.compact_mode_hint',
  },
  {
    key: 'blurMedia',
    labelKey: 'settings.timeline.blur_media',
    hintKey: 'settings.timeline.blur_media_hint',
  },
] as const;

export default function SettingsTimelinePageContent() {
  const { t } = useTranslation();
  const { preferences, savePreference, isSaving } = useSettingsPreferences();

  if (!preferences) {
    return null;
  }

  return (
    <SettingsPageShell
      titleKey="settings.title_timeline"
      descriptionKey="settings.timeline.description"
    >
      <Flex asChild direction="column" gap="4">
        <ul className="m-0 list-none p-0">
          {TIMELINE_TOGGLES.map(toggle => (
            <Flex
              asChild
              key={toggle.key}
              align="start"
              justify="between"
              gap="4"
            >
              <li>
                <Flex direction="column" gap="1">
                  <Text
                    as="label"
                    htmlFor={toggle.key}
                    size="2"
                    className="text-foreground/85"
                  >
                    {t(toggle.labelKey)}
                  </Text>
                  <Text
                    as="p"
                    id={`${toggle.key}-hint`}
                    size="1"
                    className="text-foreground/50"
                  >
                    {t(toggle.hintKey)}
                  </Text>
                </Flex>
                <Switch
                  id={toggle.key}
                  aria-describedby={`${toggle.key}-hint`}
                  checked={preferences.timeline[toggle.key]}
                  disabled={isSaving}
                  onCheckedChange={checked =>
                    savePreference('timeline', { [toggle.key]: checked })
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
