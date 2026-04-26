import type { YieldSet } from '../types/Yields';

/** Adjacency yields a wonder gives to each neighbor building tile. VII spec. */
export const WONDER_ADJACENCY_PER_NEIGHBOR: Partial<YieldSet> = {
  culture: 2,
  science: 1,
} as const;

/**
 * F-02: Adjacency yields a natural wonder tile gives to each neighbor
 * district building. Same magnitudes as player-built wonder adjacency
 * (culture +2, science +1) — the two rules stack independently.
 */
export const NATURAL_WONDER_ADJACENCY_PER_NEIGHBOR: Partial<YieldSet> = {
  culture: 2,
  science: 1,
} as const;

/**
 * F-02: Adjacency yields a coastal (ocean/water) tile gives to each
 * neighbor district building. +1 Food, +1 Gold per adjacent water tile.
 */
export const COASTAL_ADJACENCY_PER_NEIGHBOR: Partial<YieldSet> = {
  food: 1,
  gold: 1,
} as const;

/**
 * F-02: Adjacency yields a resource tile gives to each neighbor district
 * building. +1 Production, +1 Science per adjacent tile with a resource.
 */
export const RESOURCE_ADJACENCY_PER_NEIGHBOR: Partial<YieldSet> = {
  production: 1,
  science: 1,
} as const;

/** Multiplier coefficient for specialist-assigned tile's adjacency bonus. */
export const SPECIALIST_AMPLIFIER = 0.5;

/**
 * Maximum number of specialists that contribute to adjacency amplification
 * (KK3.2 — population-specialists F-03).
 * With SPECIALIST_AMPLIFIER = 0.5 and this cap = 2, the maximum multiplier is
 * 1 + 0.5 × 2 = 2.0 (i.e. 100% bonus cap).
 */
export const SPECIALIST_AMPLIFIER_MAX_COUNT = 2;
