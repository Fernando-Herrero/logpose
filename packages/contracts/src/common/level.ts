/** Highest level L whose cumulative threshold 15·L·(L−1) fits in `experience` (ADR 0021). */
export function levelFromExperience(experience: number): number {
  return Math.floor((1 + Math.sqrt(1 + (4 * experience) / 15)) / 2);
}
