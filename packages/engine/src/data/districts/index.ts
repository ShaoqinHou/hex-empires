/**
 * District Data Registry
 *
 * Barrel export for all district definitions across all ages.
 */

import type { DistrictDef } from '../../types/District';
import { ALL_ANTIQUITY_DISTRICTS } from './antiquity-districts';
import { ALL_EXPLORATION_DISTRICTS } from './exploration-districts';
import { ALL_MODERN_DISTRICTS } from './modern-districts';

/**
 * All districts in the game
 */
export const ALL_DISTRICTS: ReadonlyArray<DistrictDef> = [
  ...ALL_ANTIQUITY_DISTRICTS,
  ...ALL_EXPLORATION_DISTRICTS,
  ...ALL_MODERN_DISTRICTS,
];
