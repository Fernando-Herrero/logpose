import { describe, expect, it } from 'vitest';

import { getArcArrivalDate } from '@/features/serie/serie.selectors';

// Las fechas se construyen con hora local: sin fijar la zona, el caso del
// cambio de hora solo tendría sentido en máquinas configuradas en Europa.
process.env.TZ = 'Europe/Madrid';

const today = new Date(2026, 10, 19);

describe('getArcArrivalDate', () => {
  it.each([
    ['Loguetown (episodio 45)', 45, new Date(2026, 10, 20)],
    ['Wano acto 1 (episodio 890)', 890, new Date(2027, 7, 29)],
  ])('llega a %s con el ritmo de 3 al día', (_, firstEpisode, expected) => {
    expect(
      getArcArrivalDate({
        firstEpisode,
        lastWatchedEpisode: 40,
        episodesPerDay: 3,
        today,
      }),
    ).toEqual(expected);
  });

  it('llega hoy si el arco empieza en el episodio siguiente al visto', () => {
    expect(
      getArcArrivalDate({
        firstEpisode: 41,
        lastWatchedEpisode: 40,
        episodesPerDay: 3,
        today,
      }),
    ).toEqual(new Date(2026, 10, 19));
  });

  it.each([
    ['0', 0],
    ['NaN (campo vacío)', NaN],
  ])('no da fecha si el ritmo es %s', (_, episodesPerDay) => {
    expect(
      getArcArrivalDate({
        firstEpisode: 45,
        lastWatchedEpisode: 40,
        episodesPerDay,
        today,
      }),
    ).toBeUndefined();
  });

  it.each([
    [
      'de verano a invierno (31 oct 2027) a las 23:30',
      new Date(2027, 9, 30, 23, 30),
      new Date(2027, 10, 2),
    ],
    [
      'de invierno a verano (28 mar 2027) a las 23:30',
      new Date(2027, 2, 27, 23, 30),
      new Date(2027, 2, 30),
    ],
    [
      'de verano a invierno (31 oct 2027) desde medianoche',
      new Date(2027, 9, 30),
      new Date(2027, 10, 2),
    ],
    [
      'de invierno a verano (28 mar 2027) desde medianoche',
      new Date(2027, 2, 27),
      new Date(2027, 2, 30),
    ],
  ])(
    'suma 3 días de calendario al cruzar el cambio de hora %s',
    (_, today, expected) => {
      expect(
        getArcArrivalDate({
          firstEpisode: 14,
          lastWatchedEpisode: 10,
          episodesPerDay: 1,
          today,
        }),
      ).toEqual(expected);
    },
  );
});
