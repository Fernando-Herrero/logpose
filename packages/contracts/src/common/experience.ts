import type * as z from 'zod/v4';

import type { episodeTypeSchema } from './serie.schemas.js';

// XP de un episodio (ADR 0021): base por tipo, más sus eventos y los cierres de arco y saga.
export const EPISODE_TYPE_EXPERIENCE = {
  canon: 100,
  mixed: 75,
  filler: 40,
  recap: 40,
} satisfies Record<z.infer<typeof episodeTypeSchema>, number>;
export const EVENT_EXPERIENCE = 25;
export const ARC_END_EXPERIENCE = 250;
export const SAGA_END_EXPERIENCE = 1000;
