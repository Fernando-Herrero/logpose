import type { Locale } from '@/integrations/next-i18next/constants';

export const serieKeys = {
  all: ['serie'] as const,
  sagas: () => [...serieKeys.all, 'sagas'] as const,
  arcs: (sagaSlug: string) => [...serieKeys.all, 'arcs', sagaSlug] as const,
  episodes: (arcSlug: string) =>
    [...serieKeys.all, 'episodes', arcSlug] as const,
  arcTexts: (arcSlug: string, locale: Locale) =>
    [...serieKeys.all, 'arc-texts', arcSlug, locale] as const,
  progress: () => [...serieKeys.all, 'progress'] as const,
  episode: (episodeNumber: number) =>
    [...serieKeys.all, 'episode', episodeNumber] as const,
};
