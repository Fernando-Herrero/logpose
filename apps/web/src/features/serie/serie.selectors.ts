export function getSerieXpPercent(experience: number, totalExperience: number) {
  return Math.min(100, Math.round((experience / totalExperience) * 100));
}

type ArcArrivalInput = {
  firstEpisode: number;
  lastWatchedEpisode: number;
  episodesPerDay: number;
  today: Date;
};

export function getArcArrivalDate({
  firstEpisode,
  lastWatchedEpisode,
  episodesPerDay,
  today,
}: ArcArrivalInput) {
  // Negado para que también descarte NaN, que es lo que da el campo vacío.
  if (!(episodesPerDay >= 1)) return undefined;

  const days = Math.floor(
    (firstEpisode - lastWatchedEpisode - 1) / episodesPerDay,
  );

  // Días de calendario, no milisegundos: el cambio de hora no mueve la fecha.
  return new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + days,
  );
}
