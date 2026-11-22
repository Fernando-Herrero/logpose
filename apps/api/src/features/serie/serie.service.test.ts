import { describe, expect, it } from 'vitest';

import { SerieService } from './serie.service.js';

describe('SerieService.listSagas', () => {
  it('devuelve las sagas con su total, empezando por East Blue', () => {
    const { sagas, total } = new SerieService().listSagas();

    expect(total).toBeGreaterThan(0);
    expect(total).toBe(sagas.length);
    expect(sagas[0]).toMatchObject({ slug: 'east-blue' });
  });

  it('suma la experiencia de los 1180 episodios con la regla del ADR 0021', () => {
    const { totalExperience } = new SerieService().listSagas();

    expect(totalExperience).toBe(145_360);
  });
});

describe('SerieService.listArcs', () => {
  it('devuelve los 54 arcos con su total', () => {
    const { arcs, total } = new SerieService().listArcs();

    expect(total).toBe(54);
    expect(arcs).toHaveLength(54);
  });

  it('empieza en Romance Dawn y acaba en Elbaph, con la forma del JSON', () => {
    const { arcs } = new SerieService().listArcs();

    expect(arcs[0]).toEqual({
      slug: 'romance-dawn',
      sagaSlug: 'east-blue',
      type: 'canon',
      totalEpisodes: 3,
      firstEpisode: 1,
      skippableEpisodes: [],
    });
    expect(arcs.at(-1)).toEqual({
      slug: 'elbaph',
      sagaSlug: 'final-saga',
      type: 'canon',
      totalEpisodes: 25,
      firstEpisode: 1156,
      skippableEpisodes: [],
    });
  });

  it('mantiene el orden del fichero, no el del primer episodio: Buggy (46) va antes que Loguetown (45)', () => {
    const slugs = new SerieService().listArcs().arcs.map(arc => arc.slug);

    expect(slugs.indexOf('loguetown')).toBe(
      slugs.indexOf('buggy-side-story') + 1,
    );
  });
});
