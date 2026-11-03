import { useQuery, useSuspenseQuery } from '@tanstack/react-query';

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
