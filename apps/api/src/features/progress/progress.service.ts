import { getProgressUnlockedAvatarIds } from '@logpose/contracts/common/avatar';
import { levelFromExperience } from '@logpose/contracts/common/level';
import { Injectable } from '@nestjs/common';
import { ORPCError } from '@orpc/server';

import { experienceUpTo, getEpisodeByNumber } from '../serie/serie-data.js';
import { UsersPersistence } from '../users/users.persistence.js';

function progressState(lastWatchedEpisode: number, experience: number) {
  return {
    lastWatchedEpisode,
    experience,
    level: levelFromExperience(experience),
    avatars: getProgressUnlockedAvatarIds(lastWatchedEpisode),
  };
}

@Injectable()
export class ProgressService {
  constructor(private readonly users: UsersPersistence) {}

  /** Reescribe el progreso entero, nunca suma: repetir la misma N no cambia nada (ADR 0021). */
  async set(userId: string, lastWatchedEpisode: number) {
    if (lastWatchedEpisode > 0 && !getEpisodeByNumber(lastWatchedEpisode)) {
      throw new ORPCError('EPISODE_NOT_FOUND');
    }

    const experience = experienceUpTo(lastWatchedEpisode);
    const before = await this.users.setProgress(
      userId,
      lastWatchedEpisode,
      experience,
    );

    if (!before) {
      throw new ORPCError('UNAUTHORIZED');
    }

    return {
      before: progressState(before.lastWatchedEpisode, before.experience),
      after: progressState(lastWatchedEpisode, experience),
    };
  }
}
