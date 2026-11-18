import { arcTextsSchema } from '@logpose/contracts/common/serie.schemas';
import { queryOptions } from '@tanstack/react-query';

import { serieKeys } from '@/features/serie/api/serie.keys';
import type { Locale } from '@/integrations/next-i18next/constants';
import type { OrpcClient } from '@/integrations/orpc/orpc.client';

export const getSerieQueriesOptions = (client: OrpcClient) => ({
  sagas: () =>
    queryOptions({
      queryKey: serieKeys.sagas(),
      queryFn: () => client.serie.listSagas(),
    }),

  arcsBySaga: (sagaSlug: string) =>
    queryOptions({
      queryKey: serieKeys.arcs(sagaSlug),
      queryFn: () => client.serie.listArcsBySaga({ params: { sagaSlug } }),
    }),

  episodesByArc: (arcSlug: string) =>
    queryOptions({
      queryKey: serieKeys.episodes(arcSlug),
      queryFn: () => client.serie.listEpisodesByArc({ params: { arcSlug } }),
    }),

  // Fichero estático de public/, fuera del contrato oRPC: se valida aquí y solo cambia al desplegar.
  arcTexts: (arcSlug: string, locale: Locale) =>
    queryOptions({
      queryKey: serieKeys.arcTexts(arcSlug, locale),
      queryFn: async () => {
        const response = await fetch(
          `/locales/${locale}/serie-arcs/${arcSlug}.json`,
        );
        if (!response.ok) {
          throw new Error(`Could not load the texts of arc ${arcSlug}`);
        }
        return arcTextsSchema.parse(await response.json());
      },
      staleTime: Infinity,
    }),
  episode: (episodeNumber: number) =>
    queryOptions({
      queryKey: serieKeys.episode(episodeNumber),
      queryFn: () => client.serie.getEpisode({ params: { episodeNumber } }),
    }),
});
