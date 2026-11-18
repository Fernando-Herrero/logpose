import {
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';

import {
  ARC_END_EXPERIENCE,
  EPISODE_TYPE_EXPERIENCE,
  EVENT_EXPERIENCE,
  SAGA_END_EXPERIENCE,
} from '@logpose/contracts/common/experience';
import * as serie from '@logpose/contracts/common/serie.schemas';
import * as z from 'zod/v4';

type Locale = 'es' | 'en' | 'ja';
type Saga = z.infer<typeof serie.sagaSchema>;
type Arc = z.infer<typeof serie.arcSchema>;
type Episode = z.infer<typeof serie.episodeSchema>;
type ArcTexts = z.infer<typeof serie.arcTextsSchema>;

const titleSchema = z.object({
  en: z.string(),
  es: z.string().nullish(),
  ja: z.string().nullish(),
});
const summarySchema = z.object({
  es: z.string(),
  en: z.string(),
  ja: z.string(),
});

const episodeSchema = z.object({
  number: z.number().int().positive(),
  title: titleSchema,
  summary: summarySchema.nullish(),
  canon: serie.episodeTypeSchema,
  adaptsChapters: z.array(z.number().int().positive()),
});

const arcSchema = z.object({
  slug: z.string(),
  order: z.number().int().positive(),
  title: titleSchema,
  summary: summarySchema.nullish(),
  type: z.enum(['canon', 'filler', 'mixed']),
  episodes: z.array(episodeSchema),
  events: z
    .array(
      z.object({
        slug: z.string(),
        episode: z.number().int().positive().nullish(),
        description: summarySchema,
      }),
    )
    .default([]),
});

const researchSchema = z.array(
  z.object({
    slug: z.string(),
    order: z.number().int().positive(),
    title: titleSchema.extend({ ja: z.string() }),
    arcs: z.array(arcSchema),
  }),
);

const byOrder = (a: { order: number }, b: { order: number }) =>
  a.order - b.order;

const texts = (
  { title, summary }: Pick<z.infer<typeof arcSchema>, 'title' | 'summary'>,
  locale: Locale,
) => ({
  name: title[locale] ?? title.en,
  ...(summary && { description: summary[locale] }),
});

export function normalizeResearch(input: unknown) {
  const sagas = researchSchema.parse(input).sort(byOrder);
  const arcs = sagas.flatMap(saga =>
    saga.arcs.sort(byOrder).map(arc => ({ ...arc, sagaSlug: saga.slug })),
  );
  const sagaEnd = new Map(
    sagas.map(saga => [
      saga.slug,
      Math.max(...saga.arcs.flatMap(arc => arc.episodes.map(e => e.number))),
    ]),
  );
  const episodes = arcs
    .flatMap(arc => {
      const last = Math.max(...arc.episodes.map(episode => episode.number));
      return arc.episodes.map(episode => {
        const events = arc.events
          .filter(event => event.episode === episode.number)
          .map(event => event.slug);
        const closesArc = episode.number === last;
        const closesSaga = episode.number === sagaEnd.get(arc.sagaSlug);
        return {
          ...episode,
          arcSlug: arc.slug,
          events,
          closesArc,
          closesSaga,
          experience:
            EPISODE_TYPE_EXPERIENCE[episode.canon] +
            EVENT_EXPERIENCE * events.length +
            (closesArc ? ARC_END_EXPERIENCE : 0) +
            (closesSaga ? SAGA_END_EXPERIENCE : 0),
        };
      });
    })
    .sort((a, b) => a.number - b.number);

  const repeated = episodes.find(
    (episode, index) => episode.number === episodes[index - 1]?.number,
  );
  if (repeated) {
    throw new Error(`Episode ${repeated.number} is in two arcs`);
  }

  const localeTexts = (locale: Locale) => ({
    sagas: Object.fromEntries(
      sagas.map(saga => [
        saga.slug,
        { name: saga.title[locale] ?? saga.title.en, nameJa: saga.title.ja },
      ]),
    ),
    arcs: Object.fromEntries(arcs.map(arc => [arc.slug, texts(arc, locale)])),
  });

  const arcTexts = (locale: Locale) =>
    Object.fromEntries(
      arcs.map((arc): [string, ArcTexts] => [
        arc.slug,
        {
          episodes: Object.fromEntries(
            arc.episodes.map(episode => [
              episode.number,
              texts(episode, locale),
            ]),
          ),
          events: Object.fromEntries(
            arc.events.map(event => [event.slug, event.description[locale]]),
          ),
        },
      ]),
    );

  return {
    sagas: sagas.map(
      (saga): Saga => ({
        slug: saga.slug,
        totalArcs: saga.arcs.length,
        totalEpisodes: saga.arcs.reduce(
          (sum, arc) => sum + arc.episodes.length,
          0,
        ),
      }),
    ),
    arcs: arcs.map(
      (arc): Arc => ({
        slug: arc.slug,
        sagaSlug: arc.sagaSlug,
        type: arc.type,
        totalEpisodes: arc.episodes.length,
      }),
    ),
    episodes: episodes.map(
      (episode): Episode => ({
        number: episode.number,
        arcSlug: episode.arcSlug,
        type: episode.canon,
        adaptsChapters: episode.adaptsChapters,
        events: episode.events,
        closesArc: episode.closesArc,
        closesSaga: episode.closesSaga,
        experience: episode.experience,
        rewards: {
          characters: [],
          items: [],
          fruits: [],
          swords: [],
          boats: [],
        },
      }),
    ),
    locales: {
      es: localeTexts('es'),
      en: localeTexts('en'),
      ja: localeTexts('ja'),
    },
    arcTexts: {
      es: arcTexts('es'),
      en: arcTexts('en'),
      ja: arcTexts('ja'),
    },
  };
}

if (import.meta.main) {
  const root = path.join(import.meta.dirname, '../../../..');
  const sagasDir = path.join(root, 'data/research/sagas');
  const dataDir = path.join(root, 'apps/api/src/data/serie');

  const readJson = (file: string): object =>
    JSON.parse(readFileSync(file, 'utf8'));
  const writeJson = (file: string, data: unknown) =>
    writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);

  const research = readdirSync(sagasDir).map(dir => {
    const arcsDir = path.join(sagasDir, dir, 'arcs');
    return {
      ...readJson(path.join(sagasDir, dir, 'saga.json')),
      arcs: readdirSync(arcsDir).map(file =>
        readJson(path.join(arcsDir, file)),
      ),
    };
  });

  const { sagas, arcs, episodes, locales, arcTexts } =
    normalizeResearch(research);
  writeJson(path.join(dataDir, 'sagas.json'), sagas);
  writeJson(path.join(dataDir, 'arcs.json'), arcs);
  writeJson(path.join(dataDir, 'episodes.json'), episodes);
  for (const locale of ['es', 'en', 'ja'] as const) {
    const localeDir = path.join(root, 'apps/web/public/locales', locale);
    const arcsDir = path.join(localeDir, 'serie-arcs');
    writeJson(path.join(localeDir, 'serie.json'), locales[locale]);
    // Se vacía antes: un arco renombrado no deja su fichero viejo suelto.
    rmSync(arcsDir, { recursive: true, force: true });
    mkdirSync(arcsDir);
    for (const [slug, arcText] of Object.entries(arcTexts[locale])) {
      writeJson(path.join(arcsDir, `${slug}.json`), arcText);
    }
  }
}
