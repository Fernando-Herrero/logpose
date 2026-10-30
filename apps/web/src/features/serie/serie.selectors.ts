export function getSerieXpPercent(experience: number, totalExperience: number) {
  return Math.min(100, Math.round((experience / totalExperience) * 100));
}
