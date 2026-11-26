import {
  AVATAR_PROGRESS_UNLOCK_CHARACTER_IDS,
  AVATAR_PROGRESS_UNLOCK_RULES,
} from '@logpose/contracts/common/avatar';

import type { SerieArc } from '@/features/serie/serie.types';

export function getSerieXpPercent(experience: number, totalExperience: number) {
  return Math.min(100, Math.round((experience / totalExperience) * 100));
}

type ArcArrivalInput = {
  episodesLeft: number;
  episodesPerDay: number;
  today: Date;
};

export function getArcArrivalDate({
  episodesLeft,
  episodesPerDay,
  today,
}: ArcArrivalInput) {
  // Negado para que también descarte NaN, que es lo que da el campo vacío.
  if (!(episodesPerDay >= 1)) return undefined;

  const days = Math.floor(episodesLeft / episodesPerDay);

  // Días de calendario, no milisegundos: el cambio de hora no mueve la fecha.
  return new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + days,
  );
}

type PendingEpisodesInput = {
  arcs: SerieArc[];
  lastWatchedEpisode: number;
  totalEpisodes: number;
  skipFiller: boolean;
};

// Los que quedan por ver, en orden; los saltados cuentan como vistos.
export function getPendingEpisodes({
  arcs,
  lastWatchedEpisode,
  totalEpisodes,
  skipFiller,
}: PendingEpisodesInput) {
  const skipped = new Set(
    skipFiller ? arcs.flatMap(arc => arc.skippableEpisodes) : [],
  );
  return Array.from(
    { length: totalEpisodes - lastWatchedEpisode },
    (_, index) => lastWatchedEpisode + 1 + index,
  ).filter(number => !skipped.has(number));
}

export function getNextStop(input: PendingEpisodesInput) {
  const { arcs, skipFiller } = input;
  const pending = getPendingEpisodes(input);

  const episode = pending[0];
  if (episode === undefined) return undefined;

  const nextArc = arcs
    .filter(
      arc =>
        arc.firstEpisode > episode && !(skipFiller && arc.type === 'filler'),
    )
    .toSorted((a, b) => a.firstEpisode - b.firstEpisode)[0];

  return {
    episode,
    compass: nextArc && {
      arcSlug: nextArc.slug,
      remaining: pending.filter(number => number < nextArc.firstEpisode).length,
    },
  };
}

export function getNextAvatar(input: PendingEpisodesInput) {
  const id = AVATAR_PROGRESS_UNLOCK_CHARACTER_IDS.filter(
    candidate =>
      AVATAR_PROGRESS_UNLOCK_RULES[candidate] > input.lastWatchedEpisode,
  ).toSorted(
    (a, b) => AVATAR_PROGRESS_UNLOCK_RULES[a] - AVATAR_PROGRESS_UNLOCK_RULES[b],
  )[0];
  if (id === undefined) return undefined;

  const episode = AVATAR_PROGRESS_UNLOCK_RULES[id];
  return {
    id,
    remaining: getPendingEpisodes(input).filter(number => number <= episode)
      .length,
  };
}
