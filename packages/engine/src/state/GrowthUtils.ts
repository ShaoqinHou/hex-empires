import type { Age, CityState } from '../types/GameState';

/**
 * Food needed for next population point.
 * Civ VII post-patch quadratic growth formula:
 * Food Cost = Flat + (Scalar * X) + (Exponent * X^2), where X is the
 * number of growth events in the current age.
 *
 * Constants:
 * - Antiquity: 5 + 20*X + 4*X^2
 * - Exploration: 30 + 50*X + 5*X^2
 * - Modern: 60 + 60*X + 6*X^2
 */
export function getGrowthThresholdForEvents(growthEventCount: number, age: Age = 'antiquity'): number {
  const x = Math.max(0, growthEventCount);
  switch (age) {
    case 'antiquity':
      return 5 + 20 * x + 4 * x * x;
    case 'exploration':
      return 30 + 50 * x + 5 * x * x;
    case 'modern':
      return 60 + 60 * x + 6 * x * x;
    default:
      return 5 + 20 * x + 4 * x * x;
  }
}

export function getGrowthThreshold(population: number, age: Age = 'antiquity'): number {
  return getGrowthThresholdForEvents(Math.max(0, population - 1), age);
}

export function getGrowthEventCount(
  city: Pick<CityState, 'population' | 'growthEventCount'>,
): number {
  return city.growthEventCount ?? Math.max(0, city.population - 1);
}

export function getCityGrowthThreshold(
  city: Pick<CityState, 'population' | 'growthEventCount'>,
  age: Age = 'antiquity',
): number {
  return getGrowthThresholdForEvents(getGrowthEventCount(city), age);
}
