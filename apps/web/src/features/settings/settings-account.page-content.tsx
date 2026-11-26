import {
  AlertDialog,
  Button,
  Flex,
  Heading,
  Text,
  TextField,
} from '@radix-ui/themes';
import { useTranslation } from 'next-i18next/pages';
import { useState } from 'react';
import { toast } from 'sonner';

import {
  useAuthSession,
  useDeleteAccountMutation,
} from '@/features/auth/api/use-auth';
import { SettingsPageShell } from '@/features/settings/settings-page-shell.component';

export default function SettingsAccountPageContent() {
  const { t } = useTranslation();
  const { user } = useAuthSession();
  const deleteAccount = useDeleteAccountMutation();
  const [confirmEmail, setConfirmEmail] = useState('');

  if (!user) {
    return null;
  }

  const handleDeleteAccount = async () => {
    try {
      await deleteAccount.mutateAsync(user._id);
    } catch {
      toast.error(t('settings.danger_zone.delete_error'));
    }
  };

  const isConfirmed =
    confirmEmail.trim().toLowerCase() === user.email.toLowerCase();

  return (
    <SettingsPageShell
      titleKey="settings.title_security"
      descriptionKey="settings.text_security"
    >
      <Flex asChild direction="column" gap="3">
        <section
          aria-labelledby="danger-zone-title"
          className="rounded-lg border border-red-500/30 bg-red-500/5 p-4"
        >
          <Heading
            as="h2"
            id="danger-zone-title"
            size="3"
            weight="medium"
            className="text-red-400"
          >
            {t('settings.danger_zone.title')}
          </Heading>
          <Text as="p" size="2" className="text-foreground/75">
            {t('settings.danger_zone.description')}
          </Text>

          <AlertDialog.Root>
            <AlertDialog.Trigger>
              <Button color="red" className="w-fit">
                {t('settings.danger_zone.delete_button')}
              </Button>
            </AlertDialog.Trigger>
            <AlertDialog.Content maxWidth="450px">
              <AlertDialog.Title>
                {t('settings.danger_zone.confirm_title')}
              </AlertDialog.Title>
              <AlertDialog.Description size="2">
                {t('settings.danger_zone.confirm_description')}
              </AlertDialog.Description>

              <Flex direction="column" gap="2" mt="4">
                <Text
                  as="label"
                  htmlFor="confirm-email"
                  size="2"
                  className="text-foreground/85"
                >
                  {t('settings.danger_zone.confirm_email_label', {
                    email: user.email,
                  })}
                </Text>
                <TextField.Root
                  id="confirm-email"
                  value={confirmEmail}
                  onChange={e => setConfirmEmail(e.target.value)}
                  placeholder={user.email}
                />
              </Flex>

              <Flex gap="3" mt="4" justify="end">
                <AlertDialog.Cancel>
                  <Button variant="soft" color="gray">
                    {t('settings.danger_zone.confirm_cancel')}
                  </Button>
                </AlertDialog.Cancel>
                <AlertDialog.Action>
                  <Button
                    variant="solid"
                    color="red"
                    disabled={!isConfirmed || deleteAccount.isPending}
                    onClick={handleDeleteAccount}
                  >
                    {deleteAccount.isPending
                      ? '...'
                      : t('settings.danger_zone.confirm_action')}
                  </Button>
                </AlertDialog.Action>
              </Flex>
            </AlertDialog.Content>
          </AlertDialog.Root>
        </section>
      </Flex>
    </SettingsPageShell>
  );
}
