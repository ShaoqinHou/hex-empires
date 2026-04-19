import type { YieldSet } from '../types/Yields';

/** Adjacency yields a wonder gives to each neighbor building tile. VII spec. */
export const WONDER_ADJACENCY_PER_NEIGHBOR: Partial<YieldSet> = {
  culture: 2,
  science: 1,
} as const;

/** Multiplier coefficient for specialist-assigned tile's adjacency bonus. */
export const SPECIALIST_AMPLIFIER = 0.5;
