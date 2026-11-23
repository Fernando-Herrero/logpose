import { describe, expect, it } from 'vitest';

import {
  getArcArrivalDate,
  getNextStop,
  getPendingEpisodes,
} from '@/features/serie/serie.selectors';
import type { SerieArc } from '@/features/serie/serie.types';

// Las fechas se construyen con hora local: sin fijar la zona, el caso del
// cambio de hora solo tendría sentido en máquinas configuradas en Europa.
process.env.TZ = 'Europe/Madrid';

const today = new Date(2026, 10, 19);

describe('getArcArrivalDate', () => {
  // Tras el 40: hasta Loguetown (45) faltan 4; hasta Wano (890), 849.
  it.each([
    ['Loguetown (episodio 45)', 4, new Date(2026, 10, 20)],
    ['Wano acto 1 (episodio 890)', 849, new Date(2027, 7, 29)],
  ])('llega a %s con el ritmo de 3 al día', (_, episodesLeft, expected) => {
    expect(
      getArcArrivalDate({ episodesLeft, episodesPerDay: 3, today }),
    ).toEqual(expected);
  });

  it('llega hoy si no falta ningún episodio antes del arco', () => {
    expect(
      getArcArrivalDate({
        episodesLeft: 0,
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
        episodesLeft: 4,
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
        getArcArrivalDate({ episodesLeft: 3, episodesPerDay: 1, today }),
      ).toEqual(expected);
    },
  );
});

// Arcos reales de arcs.json en el orden del fichero: loguetown (45) va
// después de buggy-side-story (46), así que no vienen ordenados por episodio.
const arcs: SerieArc[] = [
  {
    slug: 'baratie',
    sagaSlug: 'east-blue',
    type: 'canon',
    totalEpisodes: 12,
    firstEpisode: 19,
    skippableEpisodes: [],
  },
  {
    slug: 'arlong-park',
    sagaSlug: 'east-blue',
    type: 'canon',
    totalEpisodes: 14,
    firstEpisode: 31,
    skippableEpisodes: [],
  },
  {
    slug: 'buggy-side-story',
    sagaSlug: 'east-blue',
    type: 'mixed',
    totalEpisodes: 2,
    firstEpisode: 46,
    skippableEpisodes: [],
  },
  {
    slug: 'loguetown',
    sagaSlug: 'east-blue',
    type: 'mixed',
    totalEpisodes: 7,
    firstEpisode: 45,
    skippableEpisodes: [50],
  },
  {
    slug: 'warship-island',
    sagaSlug: 'east-blue',
    type: 'filler',
    totalEpisodes: 8,
    firstEpisode: 54,
    skippableEpisodes: [54, 55, 56, 57, 58, 59, 60],
  },
  {
    slug: 'reverse-mountain',
    sagaSlug: 'arabasta',
    type: 'canon',
    totalEpisodes: 2,
    firstEpisode: 62,
    skippableEpisodes: [],
  },
  {
    slug: 'whisky-peak',
    sagaSlug: 'arabasta',
    type: 'canon',
    totalEpisodes: 4,
    firstEpisode: 64,
    skippableEpisodes: [],
  },
  {
    slug: 'koby-and-helmeppo',
    sagaSlug: 'arabasta',
    type: 'mixed',
    totalEpisodes: 2,
    firstEpisode: 68,
    skippableEpisodes: [],
  },
  {
    slug: 'little-garden',
    sagaSlug: 'arabasta',
    type: 'canon',
    totalEpisodes: 8,
    firstEpisode: 70,
    skippableEpisodes: [],
  },
  {
    slug: 'drum-island',
    sagaSlug: 'arabasta',
    type: 'canon',
    totalEpisodes: 14,
    firstEpisode: 78,
    skippableEpisodes: [],
  },
];

describe('getNextStop', () => {
  it.each([
    // [descripción, último visto, skipFiller, episodio, arco de la brújula, faltan]
    ['apagado, tras el 39', 39, false, 40, 'loguetown', 5],
    // El 54 y el 61 son de Warship Island; con el interruptor encendido el
    // siguiente episodio es el 61 (mixto, no saltable) y no el 54.
    ['encendido, tras el 53', 53, true, 61, 'reverse-mountain', 1],
    ['apagado, tras el 53', 53, false, 54, 'reverse-mountain', 8],
    // Warship Island (54) es relleno: apagado recibe la brújula, encendido no.
    [
      'apagado, un arco de relleno recibe la brújula',
      50,
      false,
      51,
      'warship-island',
      3,
    ],
    [
      'encendido, un arco de relleno no recibe la brújula',
      50,
      true,
      51,
      'reverse-mountain',
      4,
    ],
    // De 46 a 61 hay 16 episodios; el 50 y el 54-60 se saltan y no cuentan.
    [
      'encendido, los saltables del recorrido no cuentan',
      45,
      true,
      46,
      'reverse-mountain',
      8,
    ],
  ])('%s', (_, lastWatchedEpisode, skipFiller, episode, arcSlug, remaining) => {
    expect(
      getNextStop({ arcs, lastWatchedEpisode, totalEpisodes: 91, skipFiller }),
    ).toEqual({ episode, compass: { arcSlug, remaining } });
  });

  it('no da siguiente parada si ya has visto todos los episodios', () => {
    expect(
      getNextStop({
        arcs,
        lastWatchedEpisode: 91,
        totalEpisodes: 91,
        skipFiller: false,
      }),
    ).toBeUndefined();
  });

  it('no da siguiente parada si todo lo que queda es saltable', () => {
    expect(
      getNextStop({
        arcs,
        lastWatchedEpisode: 53,
        totalEpisodes: 60,
        skipFiller: true,
      }),
    ).toBeUndefined();
  });

  it('da el episodio sin brújula si no queda ningún arco después', () => {
    expect(
      getNextStop({
        arcs,
        lastWatchedEpisode: 80,
        totalEpisodes: 91,
        skipFiller: false,
      }),
    ).toEqual({ episode: 81, compass: undefined });
  });
});

describe('getPendingEpisodes', () => {
  it('apagado, tras el 53, devuelve del 54 al 62', () => {
    expect(
      getPendingEpisodes({
        arcs,
        lastWatchedEpisode: 53,
        totalEpisodes: 62,
        skipFiller: false,
      }),
    ).toEqual([54, 55, 56, 57, 58, 59, 60, 61, 62]);
  });

  it('encendido, tras el 53, solo quedan el 61 y el 62', () => {
    expect(
      getPendingEpisodes({
        arcs,
        lastWatchedEpisode: 53,
        totalEpisodes: 62,
        skipFiller: true,
      }),
    ).toEqual([61, 62]);
  });

  it('encendido, tras el 45, se salta el 50 y del 54 al 60', () => {
    expect(
      getPendingEpisodes({
        arcs,
        lastWatchedEpisode: 45,
        totalEpisodes: 62,
        skipFiller: true,
      }),
    ).toEqual([46, 47, 48, 49, 51, 52, 53, 61, 62]);
  });

  it.each([
    ['encendido', true, 1],
    ['apagado', false, 8],
  ])(
    '%s, tras el 53, quedan %i episodios antes de Reverse Mountain (62)',
    (_, skipFiller, expected) => {
      expect(
        getPendingEpisodes({
          arcs,
          lastWatchedEpisode: 53,
          totalEpisodes: 62,
          skipFiller,
        }).filter(n => n < 62).length,
      ).toBe(expected);
    },
  );

  it.each([
    ['has visto todo', 62],
    ['lo visto supera el total', 70],
  ])('devuelve [] si %s', (_, lastWatchedEpisode) => {
    expect(
      getPendingEpisodes({
        arcs,
        lastWatchedEpisode,
        totalEpisodes: 62,
        skipFiller: false,
      }),
    ).toEqual([]);
  });
});
