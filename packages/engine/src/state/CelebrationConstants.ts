import type { Age } from '../types/GameState';

// Per-age celebration happiness thresholds (cumulative)
export const CELEBRATION_THRESHOLDS: Record<Age, ReadonlyArray<number>> = {
  antiquity: [200, 349, 569, 773, 962, 1137, 1296],
  exploration: [799, 1396, 2275, 3093, 3850, 4546, 5182],
  modern: [1331, 2327, 3791, 5155, 6416, 7576, 8636],
} as const;

// Celebration duration (turns) by game speed
export const CELEBRATION_DURATION: Record<string, number> = {
  online: 5,
  quick: 10,
  standard: 10,
  epic: 15,
  marathon: 30,
} as const;

/** Returns the next threshold the player must cross. `count` is celebrationCount (0-6). */
export function celebrationThresholdForCount(age: Age, count: number): number {
  const table = CELEBRATION_THRESHOLDS[age];
  return table[Math.min(count, 6)];
}
