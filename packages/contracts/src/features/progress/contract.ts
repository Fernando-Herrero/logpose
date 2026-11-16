import { oc } from '@orpc/contract';

import { serieErrors } from '../serie/contract.js';
import { setProgressInputSchema, setProgressOutputSchema } from './schemas.js';

export const progressContract = oc
  .tag('Progress')
  .prefix('/progress')
  .router({
    set: oc
      .route({
        method: 'PUT',
        path: '/me',
        description:
          'Set the last watched episode (0 resets) and recompute experience',
      })
      .input(setProgressInputSchema)
      .errors({ EPISODE_NOT_FOUND: serieErrors.EPISODE_NOT_FOUND })
      .output(setProgressOutputSchema),
  });
