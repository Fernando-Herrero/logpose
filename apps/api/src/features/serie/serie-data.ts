import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  arcSchema,
  episodeSchema,
  sagaSchema,
} from '@logpose/contracts/common/serie.schemas';
import * as z from 'zod/v4';

const serieDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../data/serie',
);

function readSerieFile<T>(fileName: string, schema: z.ZodType<T>) {
  const filePath = path.join(serieDir, fileName);
  return z.array(schema).parse(JSON.parse(readFileSync(filePath, 'utf8')));
}

// Se valida al importar: un JSON que no cumple el contrato tumba el arranque, no una petición.
export const sagas = readSerieFile('sagas.json', sagaSchema);
export const arcs = readSerieFile('arcs.json', arcSchema);
const episodes = readSerieFile('episodes.json', episodeSchema);

export const totalExperience = experienceUpTo(episodes.length);

/** XP de los episodios 1 a N (ADR 0021). */
export function experienceUpTo(lastWatchedEpisode: number) {
  return episodes
    .filter(episode => episode.number <= lastWatchedEpisode)
    .reduce((sum, episode) => sum + episode.experience, 0);
}

export function getSagaBySlug(sagaSlug: string) {
  return sagas.find(saga => saga.slug === sagaSlug);
}

export function getArcBySlug(arcSlug: string) {
  return arcs.find(arc => arc.slug === arcSlug);
}

export function getEpisodeByNumber(episodeNumber: number) {
  return episodes.find(episode => episode.number === episodeNumber);
}

export function getArcsBySagaSlug(sagaSlug: string) {
  return arcs.filter(arc => arc.sagaSlug === sagaSlug);
}

export function getEpisodesByArcSlug(arcSlug: string) {
  return episodes.filter(episode => episode.arcSlug === arcSlug);
}
