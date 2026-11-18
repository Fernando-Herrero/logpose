import {
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query';
import { useTranslation } from 'next-i18next/pages';
import { toast } from 'sonner';

import {
  getSessionUser,
  useSessionUserWriter,
} from '@/features/auth/api/session-user';
import { profileKeys } from '@/features/profile/api/profile.keys';
import { useLocale } from '@/integrations/next-i18next/use-locale';
import { client } from '@/integrations/orpc/orpc.client';
import { allQueriesOptions } from '@/integrations/tanstack-query/queries-options';

type SerieQueryOptions = {
  enabled?: boolean;
};

export function useSuspenseSerieSagas() {
  return useSuspenseQuery(allQueriesOptions.serie.sagas());
}

export function useSerieTotalExperience() {
  const { data } = useSuspenseQuery({
    ...allQueriesOptions.serie.sagas(),
    select: sagas => sagas.totalExperience,
  });
  return data;
}

export function useSerieArcs(sagaSlug: string, options?: SerieQueryOptions) {
  return useQuery({
    ...allQueriesOptions.serie.arcsBySaga(sagaSlug),
    enabled: options?.enabled,
  });
}

export function useSerieEpisodes(arcSlug: string, options?: SerieQueryOptions) {
  return useQuery({
    ...allQueriesOptions.serie.episodesByArc(arcSlug),
    enabled: options?.enabled,
  });
}

export function useSerieArcTexts(arcSlug: string, options?: SerieQueryOptions) {
  const locale = useLocale();
  return useQuery({
    ...allQueriesOptions.serie.arcTexts(arcSlug, locale),
    enabled: options?.enabled,
  });
}

export function useSetProgressMutation() {
  const queryClient = useQueryClient();
  const writeSessionUser = useSessionUserWriter();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (lastWatchedEpisode: number) =>
      client.progress.set({ lastWatchedEpisode }),
    onSuccess: ({ after }) => {
      const sessionUser = getSessionUser(queryClient);

      if (sessionUser) {
        writeSessionUser({
          ...sessionUser,
          lastWatchedEpisode: after.lastWatchedEpisode,
          experience: after.experience,
        });
        void queryClient.invalidateQueries({
          queryKey: profileKeys.byId(sessionUser._id),
        });
      }

      void queryClient.invalidateQueries({ queryKey: profileKeys.ranking() });
    },
    onError: () => {
      toast.error(t('serie.progress_error'));
    },
  });
}
