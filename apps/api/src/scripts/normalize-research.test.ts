import { describe, expect, it } from 'vitest';

import { normalizeResearch } from './normalize-research.js';

const noRewards = {
  characters: [],
  items: [],
  fruits: [],
  swords: [],
  boats: [],
};

const phrase = (slug: string) => ({
  es: `${slug} es`,
  en: `${slug} en`,
  ja: `${slug} ja`,
});

// Entrada en desorden a propósito: sagas, arcos y episodios fuera de su orden.
// `episodeRange` de Loguetown (45–53) contiene al de Buggy (46–47), como en los datos reales.
// En alabasta, el arco de `order` 1 tiene episodios más altos que el de `order` 2.
const buildInput = () => [
  {
    slug: 'alabasta',
    order: 2,
    title: { en: 'Alabasta', ja: 'アラバスタ編' },
    episodeRange: { first: 80, last: 92 },
    arcs: [
      {
        slug: 'little-garden',
        sagaSlug: 'alabasta',
        order: 2,
        title: {
          es: 'Jardín Pequeño',
          en: 'Little Garden',
          ja: 'リトルガーデン編',
        },
        type: 'canon',
        chapters: [],
        episodes: [
          {
            number: 80,
            title: { en: '80 en', ja: '80 ja' },
            canon: 'canon',
            adaptsChapters: [101],
          },
        ],
        events: [
          { slug: 'crocus', episode: 80, description: phrase('crocus') },
        ],
      },
      {
        slug: 'whisky-peak',
        sagaSlug: 'alabasta',
        order: 1,
        title: { en: 'Whisky Peak' },
        summary: {
          es: 'Whisky Peak resumen es',
          en: 'Whisky Peak summary en',
          ja: 'ウイスキーピーク要約',
        },
        type: 'filler',
        episodes: [
          {
            number: 92,
            title: { es: '92 es', en: '92 en' },
            summary: {
              es: '92 resumen es',
              en: '92 summary en',
              ja: '92 要約',
            },
            canon: 'filler',
            adaptsChapters: [],
          },
          {
            number: 91,
            title: { en: '91 en' },
            canon: 'filler',
            adaptsChapters: [],
          },
        ],
      },
    ],
  },
  {
    slug: 'east-blue',
    order: 1,
    title: { es: 'East Blue', en: 'East Blue', ja: 'イーストブルー編' },
    chapterRange: { first: 1, last: 100 },
    sources: [{ url: 'https://example.test', field: 'title' }],
    arcs: [
      {
        slug: 'loguetown',
        sagaSlug: 'east-blue',
        order: 7,
        title: { es: 'Loguetown', en: 'Loguetown', ja: 'ローグタウン編' },
        summary: {
          es: 'Loguetown resumen es',
          en: 'Loguetown summary en',
          ja: 'ローグタウン要約',
        },
        type: 'mixed',
        episodeRange: { first: 45, last: 53 },
        episodes: [
          {
            number: 53,
            title: { es: '53 es', en: '53 en', ja: '53 ja' },
            canon: 'mixed',
            adaptsChapters: [100],
          },
          {
            number: 45,
            title: { es: '¡Recompensa!', en: 'Bounty!', ja: '賞金首！' },
            summary: { es: 'Resumen 45 es', en: 'Summary 45 en', ja: '要約45' },
            adaptsChapters: [96, 97],
            canon: 'canon',
          },
          {
            number: 48,
            title: { en: 'Episode 48 en', ja: '第48話' },
            canon: 'filler',
            adaptsChapters: [],
          },
        ],
        events: [
          {
            slug: 'buggy-bounty',
            episode: 45,
            description: phrase('buggy-bounty'),
          },
          {
            slug: 'luffy-bounty',
            episode: 45,
            description: phrase('luffy-bounty'),
          },
          {
            slug: 'loguetown-rain',
            episode: null,
            description: phrase('loguetown-rain'),
          },
        ],
      },
      {
        slug: 'buggy-side-story',
        sagaSlug: 'east-blue',
        order: 6,
        title: { en: 'Buggy Side Story', ja: 'バギー一味冒険記' },
        type: 'mixed',
        chapterRange: null,
        episodeRange: { first: 46, last: 47 },
        episodes: [
          {
            number: 47,
            title: { es: '47 es', en: '47 en', ja: '47 ja' },
            summary: {
              es: '47 resumen es',
              en: '47 summary en',
              ja: '47 要約',
            },
            canon: 'recap',
            adaptsChapters: [],
          },
          {
            number: 46,
            title: { en: '46 en', ja: '46 ja' },
            canon: 'mixed',
            adaptsChapters: [],
          },
        ],
      },
    ],
  },
];

describe('normalizeResearch', () => {
  it('devuelve exactamente sagas, arcs, episodes, locales y arcTexts', () => {
    const result = normalizeResearch(buildInput());

    expect(Object.keys(result).sort()).toEqual([
      'arcTexts',
      'arcs',
      'episodes',
      'locales',
      'sagas',
    ]);
    expect(Object.keys(result.locales).sort()).toEqual(['en', 'es', 'ja']);
    expect(Object.keys(result.arcTexts).sort()).toEqual(['en', 'es', 'ja']);
  });

  it('ordena las sagas por su order, no por el orden de entrada', () => {
    expect(normalizeResearch(buildInput()).sagas).toStrictEqual([
      { slug: 'east-blue', totalArcs: 2, totalEpisodes: 5 },
      { slug: 'alabasta', totalArcs: 2, totalEpisodes: 3 },
    ]);
  });

  it('ordena los arcos por el order de su saga y luego por su order, no por su primer episodio', () => {
    expect(normalizeResearch(buildInput()).arcs).toStrictEqual([
      {
        slug: 'buggy-side-story',
        sagaSlug: 'east-blue',
        type: 'mixed',
        totalEpisodes: 2,
        firstEpisode: 46,
        skippableEpisodes: [47],
      },
      {
        slug: 'loguetown',
        sagaSlug: 'east-blue',
        type: 'mixed',
        totalEpisodes: 3,
        firstEpisode: 45,
        skippableEpisodes: [48],
      },
      {
        slug: 'whisky-peak',
        sagaSlug: 'alabasta',
        type: 'filler',
        totalEpisodes: 2,
        firstEpisode: 91,
        skippableEpisodes: [91, 92],
      },
      {
        slug: 'little-garden',
        sagaSlug: 'alabasta',
        type: 'canon',
        totalEpisodes: 1,
        firstEpisode: 80,
        skippableEpisodes: [],
      },
    ]);
  });

  it('da a cada arco como firstEpisode su episodio más bajo, aunque su order vaya antes que el de otro arco con episodios más bajos', () => {
    const firstOf = Object.fromEntries(
      normalizeResearch(buildInput()).arcs.map(a => [a.slug, a.firstEpisode]),
    );

    expect(firstOf).toStrictEqual({
      'buggy-side-story': 46, // su episodeRange es 46–47, pero Loguetown (order 7) contiene el 45–53
      loguetown: 45,
      'whisky-peak': 91, // order 1, pero sus episodios son más altos que los de Little Garden (80)
      'little-garden': 80,
    });
  });

  it('lleva en skippableEpisodes los episodios filler y recap de cada arco en orden ascendente, sin los mixed ni los canon', () => {
    const skippableOf = Object.fromEntries(
      normalizeResearch(buildInput()).arcs.map(a => [
        a.slug,
        a.skippableEpisodes,
      ]),
    );

    expect(skippableOf).toStrictEqual({
      'buggy-side-story': [47], // 47 es recap; el 46 es mixed y no entra
      loguetown: [48], // 48 es filler; el 45 (canon) y el 53 (mixed) no entran
      'whisky-peak': [91, 92], // ambos filler, y en la entrada vienen como 92, 91
      'little-garden': [], // su único episodio (80) es canon
    });
  });

  it('ordena los episodios por número ascendente', () => {
    const numbers = normalizeResearch(buildInput()).episodes.map(e => e.number);

    expect(numbers).toStrictEqual([45, 46, 47, 48, 53, 80, 91, 92]);
  });

  it('asigna cada episodio al arco donde aparece, no al que lo contiene por episodeRange', () => {
    const arcOf = Object.fromEntries(
      normalizeResearch(buildInput()).episodes.map(e => [e.number, e.arcSlug]),
    );

    expect(arcOf).toStrictEqual({
      45: 'loguetown',
      46: 'buggy-side-story',
      47: 'buggy-side-story',
      48: 'loguetown',
      53: 'loguetown',
      80: 'little-garden',
      91: 'whisky-peak',
      92: 'whisky-peak',
    });
  });

  it('da a cada episodio la XP de su tipo, sus eventos y los cierres de arco y saga', () => {
    const experience = Object.fromEntries(
      normalizeResearch(buildInput()).episodes.map(e => [
        e.number,
        e.experience,
      ]),
    );

    expect(experience).toStrictEqual({
      45: 150, // canon 100 + 2 eventos
      46: 75, // mixto
      47: 290, // resumen 40 + cierra arco
      48: 40, // relleno
      53: 1325, // mixto 75 + cierra arco + cierra saga
      80: 375, // canon 100 + 1 evento + cierra arco
      91: 40, // relleno
      92: 1290, // relleno 40 + cierra arco + cierra saga
    });
  });

  it('deja rewards vacío en todos los episodios y sin más campos', () => {
    const { episodes } = normalizeResearch(buildInput());

    expect(episodes).toHaveLength(8);
    for (const episode of episodes) {
      expect(episode.rewards).toStrictEqual(noRewards);
      expect(Object.keys(episode).sort()).toEqual([
        'adaptsChapters',
        'arcSlug',
        'closesArc',
        'closesSaga',
        'events',
        'experience',
        'number',
        'rewards',
        'type',
      ]);
    }
  });

  it('lleva en cada episodio su tipo, sus capítulos, sus eventos y si cierra arco o saga', () => {
    const byNumber = Object.fromEntries(
      normalizeResearch(buildInput()).episodes.map(
        ({ number, type, adaptsChapters, events, closesArc, closesSaga }) => [
          number,
          { type, adaptsChapters, events, closesArc, closesSaga },
        ],
      ),
    );

    expect(byNumber[45]).toStrictEqual({
      type: 'canon',
      adaptsChapters: [96, 97],
      events: ['buggy-bounty', 'luffy-bounty'],
      closesArc: false,
      closesSaga: false,
    });
    expect(byNumber[47]).toMatchObject({
      type: 'recap',
      closesArc: true,
      closesSaga: false,
    });
    expect(byNumber[53]).toMatchObject({ closesArc: true, closesSaga: true });
    expect(byNumber[80]).toMatchObject({
      events: ['crocus'],
      closesArc: true,
      closesSaga: false,
    });
  });

  it('genera el locale es con fallback a title.en y description solo si hay summary, sin episodios', () => {
    expect(normalizeResearch(buildInput()).locales.es).toStrictEqual({
      sagas: {
        'east-blue': { name: 'East Blue', nameJa: 'イーストブルー編' },
        alabasta: { name: 'Alabasta', nameJa: 'アラバスタ編' },
      },
      arcs: {
        'buggy-side-story': { name: 'Buggy Side Story' },
        loguetown: { name: 'Loguetown', description: 'Loguetown resumen es' },
        'whisky-peak': {
          name: 'Whisky Peak',
          description: 'Whisky Peak resumen es',
        },
        'little-garden': { name: 'Jardín Pequeño' },
      },
    });
  });

  it('genera el locale en con title.en y summary.en', () => {
    expect(normalizeResearch(buildInput()).locales.en).toStrictEqual({
      sagas: {
        'east-blue': { name: 'East Blue', nameJa: 'イーストブルー編' },
        alabasta: { name: 'Alabasta', nameJa: 'アラバスタ編' },
      },
      arcs: {
        'buggy-side-story': { name: 'Buggy Side Story' },
        loguetown: { name: 'Loguetown', description: 'Loguetown summary en' },
        'whisky-peak': {
          name: 'Whisky Peak',
          description: 'Whisky Peak summary en',
        },
        'little-garden': { name: 'Little Garden' },
      },
    });
  });

  it('genera el locale ja con title.ja y fallback a title.en cuando falta', () => {
    expect(normalizeResearch(buildInput()).locales.ja).toStrictEqual({
      sagas: {
        'east-blue': { name: 'イーストブルー編', nameJa: 'イーストブルー編' },
        alabasta: { name: 'アラバスタ編', nameJa: 'アラバスタ編' },
      },
      arcs: {
        'buggy-side-story': { name: 'バギー一味冒険記' },
        loguetown: { name: 'ローグタウン編', description: 'ローグタウン要約' },
        'whisky-peak': {
          name: 'Whisky Peak',
          description: 'ウイスキーピーク要約',
        },
        'little-garden': { name: 'リトルガーデン編' },
      },
    });
  });

  it.each([
    [
      'es',
      {
        45: { name: '¡Recompensa!', description: 'Resumen 45 es' },
        46: { name: '46 en' },
        47: { name: '47 es', description: '47 resumen es' },
        48: { name: 'Episode 48 en' },
        53: { name: '53 es' },
        80: { name: '80 en' },
        91: { name: '91 en' },
        92: { name: '92 es', description: '92 resumen es' },
      },
      {
        'buggy-side-story': 'Buggy Side Story',
        loguetown: 'Loguetown',
        'whisky-peak': 'Whisky Peak',
        'little-garden': 'Jardín Pequeño',
      },
    ],
    [
      'en',
      {
        45: { name: 'Bounty!', description: 'Summary 45 en' },
        46: { name: '46 en' },
        47: { name: '47 en', description: '47 summary en' },
        48: { name: 'Episode 48 en' },
        53: { name: '53 en' },
        80: { name: '80 en' },
        91: { name: '91 en' },
        92: { name: '92 en', description: '92 summary en' },
      },
      {
        'buggy-side-story': 'Buggy Side Story',
        loguetown: 'Loguetown',
        'whisky-peak': 'Whisky Peak',
        'little-garden': 'Little Garden',
      },
    ],
    [
      'ja',
      {
        45: { name: '賞金首！', description: '要約45' },
        46: { name: '46 ja' },
        47: { name: '47 ja', description: '47 要約' },
        48: { name: '第48話' },
        53: { name: '53 ja' },
        80: { name: '80 ja' },
        91: { name: '91 en' },
        92: { name: '92 en', description: '92 要約' },
      },
      {
        'buggy-side-story': 'バギー一味冒険記',
        loguetown: 'ローグタウン編',
        'whisky-peak': 'Whisky Peak',
        'little-garden': 'リトルガーデン編',
      },
    ],
  ] as const)(
    'genera un fichero de textos por arco en %s con su nombre, sus episodios y las frases de sus eventos',
    (locale, episodes, names) => {
      expect(normalizeResearch(buildInput()).arcTexts[locale]).toStrictEqual({
        'buggy-side-story': {
          name: names['buggy-side-story'],
          episodes: { 46: episodes[46], 47: episodes[47] },
          events: {},
        },
        loguetown: {
          name: names.loguetown,
          episodes: { 45: episodes[45], 48: episodes[48], 53: episodes[53] },
          events: {
            'buggy-bounty': `buggy-bounty ${locale}`,
            'luffy-bounty': `luffy-bounty ${locale}`,
            'loguetown-rain': `loguetown-rain ${locale}`,
          },
        },
        'whisky-peak': {
          name: names['whisky-peak'],
          episodes: { 91: episodes[91], 92: episodes[92] },
          events: {},
        },
        'little-garden': {
          name: names['little-garden'],
          episodes: { 80: episodes[80] },
          events: { crocus: `crocus ${locale}` },
        },
      });
    },
  );

  it('no crea la clave description cuando el arco o el episodio no trae summary', () => {
    const { locales, arcTexts } = normalizeResearch(buildInput());

    for (const locale of ['es', 'en', 'ja'] as const) {
      expect('description' in locales[locale].arcs['buggy-side-story']!).toBe(
        false,
      );
      expect(
        'description' in arcTexts[locale]['buggy-side-story']!.episodes[46]!,
      ).toBe(false);
    }
  });

  it('lanza si un mismo número de episodio aparece en dos arcos', () => {
    const arc = (slug: string, order: number) => ({
      slug,
      order,
      title: { en: slug },
      type: 'canon',
      episodes: [
        {
          number: 46,
          title: { en: 'Episode 46' },
          canon: 'canon',
          adaptsChapters: [],
        },
      ],
    });
    const input = [
      {
        slug: 'east-blue',
        order: 1,
        title: { en: 'East Blue', ja: 'イーストブルー編' },
        arcs: [arc('buggy-side-story', 6), arc('loguetown', 7)],
      },
    ];

    expect(() => normalizeResearch(input)).toThrow(/46/);
  });

  it.each([
    [
      'un arco con type fuera de canon/filler/mixed',
      (input: ReturnType<typeof buildInput>) => {
        (input[1]!.arcs[0]!.type as string) = 'special';
      },
    ],
    [
      'un episodio con canon fuera de canon/mixed/filler/recap',
      (input: ReturnType<typeof buildInput>) => {
        (input[0]!.arcs[0]!.episodes[0]!.canon as string) = 'special';
      },
    ],
    [
      'un evento sin su frase en japonés',
      (input: ReturnType<typeof buildInput>) => {
        delete (input[0]!.arcs[0]!.events![0]!.description as { ja?: string })
          .ja;
      },
    ],
    [
      'una saga sin slug',
      (input: ReturnType<typeof buildInput>) => {
        delete (input[0] as Partial<(typeof input)[0]>).slug;
      },
    ],
  ])('lanza si la entrada no cumple el schema: %s', (_, corrupt) => {
    const input = buildInput();
    corrupt(input);

    expect(() => normalizeResearch(input)).toThrow();
  });

  it('lanza si la entrada no es un array de sagas', () => {
    expect(() => normalizeResearch({})).toThrow();
    expect(() => normalizeResearch(null)).toThrow();
  });
});
