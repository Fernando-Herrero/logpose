import type { userPreferencesSchema } from '@logpose/contracts/common/user.schemas';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next/pages';
import { toast } from 'sonner';
import type * as z from 'zod/v4';

import {
  useAuthSession,
  useUpdatePreferencesMutation,
} from '@/features/auth/api/use-auth';
import { postsKeys } from '@/features/posts/api/posts.keys';

type UserPreferences = z.infer<typeof userPreferencesSchema>;
type PreferenceGroup = keyof UserPreferences;

/**
 * Envoltorio sobre la mutación de preferencias: envía solo el grupo tocado,
 * con el resto de ese grupo intacto, y avisa por toast del resultado.
 */
export function useSettingsPreferences() {
  const { t } = useTranslation();
  const { user } = useAuthSession();
  const updatePreferences = useUpdatePreferencesMutation();
  const queryClient = useQueryClient();

  async function savePreference<G extends PreferenceGroup>(
    group: G,
    patch: Partial<UserPreferences[G]>,
  ) {
    if (!user) {
      return;
    }

    try {
      await updatePreferences.mutateAsync({
        userId: user._id,
        body: { [group]: { ...user.preferences[group], ...patch } },
      });

      // «Siguiendo» aplica en la API el ajuste de mostrar retweets.
      if (group === 'timeline') {
        void queryClient.invalidateQueries({
          queryKey: postsKeys.feed('following'),
        });
      }

      toast.success(t('settings.preferences.save_success'));
    } catch {
      toast.error(t('settings.preferences.save_error'));
    }
  }

  return {
    preferences: user?.preferences,
    savePreference,
    isSaving: updatePreferences.isPending,
  };
}
