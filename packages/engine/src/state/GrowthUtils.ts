import type { Age } from '../types/GameState';

/**
 * Food needed for next population point.
 * Uses Civ VII age-dependent formula:
 * - Antiquity: 30 + 3*g + g^3.3
 * - Exploration: 20 + 20*g + g^3.0
 * - Modern: 20 + 40*g + g^2.7
 * where g = growthEvents = population - 1.
 * Defaults to antiquity if age is not provided.
 */
/**
 * Civ VII post-patch (v1.2.0) quadratic growth formula:
 * Food Cost = Flat + (Scalar * X) + (Exponent * X^2)
 * where X = number of growth events (population - 1)
 */
export function getGrowthThreshold(population: number, age: Age = 'antiquity'): number {
  const x = Math.max(0, population - 1);

  switch (age) {
    case 'antiquity':
      return Math.round(30 + 3 * x + 33 * x * x);
    case 'exploration':
      return Math.round(20 + 20 * x + 30 * x * x);
    case 'modern':
      return Math.round(20 + 40 * x + 27 * x * x);
    default:
      return Math.round(30 + 3 * x + 33 * x * x);
  }
}
