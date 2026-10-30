import { describe, expect, it } from 'vitest';

import { SerieService } from './serie.service.js';

describe('SerieService.listSagas', () => {
  it('devuelve las sagas con su total, empezando por East Blue', () => {
    const { sagas, total } = new SerieService().listSagas();

    expect(total).toBeGreaterThan(0);
    expect(total).toBe(sagas.length);
    expect(sagas[0]).toMatchObject({ slug: 'east-blue' });
  });

  it('suma la experiencia de todos los episodios: 54 arcos de 500 XP al final y 1126 episodios de 100 XP', () => {
    const { totalExperience } = new SerieService().listSagas();

    expect(totalExperience).toBe(139_600);
  });
});
