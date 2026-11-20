import * as z from 'zod/v4';

import { unlockedCardsSchema } from './user.schemas.js';

export const sagaSchema = z.object({
  slug: z.string(),
  totalArcs: z.number().int().nonnegative(),
  totalEpisodes: z.number().int().nonnegative(),
});

export const arcSchema = z.object({
  slug: z.string(),
  sagaSlug: z.string(),
  type: z.enum(['canon', 'filler', 'mixed']),
  totalEpisodes: z.number().int().nonnegative(),
  firstEpisode: z.number().int().positive(),
});

export const episodeTypeSchema = z.enum(['canon', 'mixed', 'filler', 'recap']);

export const episodeSchema = z.object({
  number: z.number().int().positive(),
  arcSlug: z.string(),
  type: episodeTypeSchema,
  adaptsChapters: z.array(z.number().int().positive()),
  events: z.array(z.string()),
  closesArc: z.boolean(),
  closesSaga: z.boolean(),
  experience: z.number().int().nonnegative(),
  rewards: unlockedCardsSchema,
});

export const arcTextsSchema = z.object({
  name: z.string(),
  episodes: z.record(
    z.string(),
    z.object({ name: z.string(), description: z.string().optional() }),
  ),
  events: z.record(z.string(), z.string()),
});

export const sagaListOutputSchema = z.object({
  sagas: z.array(sagaSchema),
  total: z.number().int().nonnegative(),
  totalExperience: z.number().int().nonnegative(),
});

export const arcListOutputSchema = z.object({
  sagaSlug: z.string(),
  arcs: z.array(arcSchema),
  total: z.number().int().nonnegative(),
});

export const episodeListOutputSchema = z.object({
  arcSlug: z.string(),
  episodes: z.array(episodeSchema),
  total: z.number().int().nonnegative(),
});
