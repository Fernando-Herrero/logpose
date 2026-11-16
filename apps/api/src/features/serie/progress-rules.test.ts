import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import {
  AVATAR_PROGRESS_UNLOCK_RULES,
  type AvatarProgressUnlockCharacterId,
} from '@logpose/contracts/common/avatar';
import { levelFromExperience } from '@logpose/contracts/common/level';
import { describe, expect, it } from 'vitest';

const sagasDir = path.join(
  import.meta.dirname,
  '../../../../../data/research/sagas',
);

const researchSlugs: Record<AvatarProgressUnlockCharacterId, string> = {
  robin: 'nico-robin',
  chopper: 'tony-tony-chopper',
  brook: 'brook',
  jimbe: 'jinbe',
};

type ResearchEpisode = { number: number; appearances?: string[] };

const episodes = readdirSync(sagasDir)
  .flatMap(saga => {
    const arcsDir = path.join(sagasDir, saga, 'arcs');
    return readdirSync(arcsDir).flatMap(
      file =>
        (
          JSON.parse(readFileSync(path.join(arcsDir, file), 'utf8')) as {
            episodes: ResearchEpisode[];
          }
        ).episodes,
    );
  })
  .sort((a, b) => a.number - b.number);

describe('AVATAR_PROGRESS_UNLOCK_RULES', () => {
  it.each(Object.entries(researchSlugs))(
    '%s se desbloquea en su primera aparición en research',
    (id, slug) => {
      const first = episodes.find(episode =>
        episode.appearances?.includes(slug),
      );

      expect(
        AVATAR_PROGRESS_UNLOCK_RULES[id as AvatarProgressUnlockCharacterId],
      ).toBe(first?.number);
    },
  );
});

describe('levelFromExperience', () => {
  it.each([
    [0, 1],
    [29, 1],
    [30, 2],
    [89, 2],
    [90, 3],
    [145_360, 98],
  ])('%i XP es nivel %i', (experience, level) => {
    expect(levelFromExperience(experience)).toBe(level);
  });
});
