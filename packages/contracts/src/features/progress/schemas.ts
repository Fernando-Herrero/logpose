import * as z from 'zod/v4';

import { AVATAR_PROGRESS_UNLOCK_CHARACTER_IDS } from '../../common/avatar.js';

export const setProgressInputSchema = z.object({
  lastWatchedEpisode: z.number().int().nonnegative(),
});

const progressStateSchema = z.object({
  lastWatchedEpisode: z.number().int().nonnegative(),
  experience: z.number().int().nonnegative(),
  level: z.number().int().positive(),
  avatars: z.array(z.enum(AVATAR_PROGRESS_UNLOCK_CHARACTER_IDS)),
});

export const setProgressOutputSchema = z.object({
  before: progressStateSchema,
  after: progressStateSchema,
});
