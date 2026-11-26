import { describe, expect, it } from 'vitest';

import {
  getArcArrivalDate,
  getNextAvatar,
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

describe('getNextAvatar', () => {
  it.each([
    // [descripción, último visto, skipFiller, total, avatar, faltan]
    // Robin (67): del 54 al 67 son 14.
    ['apagado, tras el 53', 53, false, 91, 'robin', 14],
    // Del 54 al 67 son 14; el 54-60 (7) se salta: 14 - 7 = 7.
    ['encendido, tras el 53', 53, true, 91, 'robin', 7],
    // Del 46 al 67 son 22.
    ['apagado, tras el 45', 45, false, 91, 'robin', 22],
    // Del 46 al 67 son 22; el 50 y el 54-60 (8) se saltan: 22 - 8 = 14.
    ['encendido, tras el 45', 45, true, 91, 'robin', 14],
    // Solo queda el 67.
    ['apagado, a un episodio de Robin', 66, false, 91, 'robin', 1],
    ['encendido, a un episodio de Robin', 66, true, 91, 'robin', 1],
    // Robin ya está (67 >= 67); Chopper (81): del 68 al 81 son 14.
    ['justo al desbloquear a Robin', 67, false, 91, 'chopper', 14],
    // Chopper ya está; Brook (337): del 82 al 337 son 256, nada saltable.
    ['apagado, tras el 81', 81, false, 1155, 'brook', 256],
    ['encendido, tras el 81', 81, true, 1155, 'brook', 256],
    // Brook ya está; Jimbe (416): del 338 al 416 son 79.
    ['justo al desbloquear a Brook', 337, false, 1155, 'jimbe', 79],
    // Usuario nuevo: del 1 al 67 son 67.
    ['apagado, sin nada visto', 0, false, 91, 'robin', 67],
    // Del 1 al 67 son 67; el 50 y el 54-60 (8) se saltan: 67 - 8 = 59.
    ['encendido, sin nada visto', 0, true, 91, 'robin', 59],
  ])(
    '%s',
    (_, lastWatchedEpisode, skipFiller, totalEpisodes, id, remaining) => {
      expect(
        getNextAvatar({ arcs, lastWatchedEpisode, totalEpisodes, skipFiller }),
      ).toEqual({ id, remaining });
    },
  );

  it.each([
    ['justo al desbloquear a Jimbe', 416],
    ['pasado Jimbe', 500],
  ])('no da avatar %s', (_, lastWatchedEpisode) => {
    expect(
      getNextAvatar({
        arcs,
        lastWatchedEpisode,
        totalEpisodes: 1155,
        skipFiller: false,
      }),
    ).toBeUndefined();
  });
});
