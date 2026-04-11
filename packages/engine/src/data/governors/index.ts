/**
 * Governor Data Registry
 *
 * Barrel export for all governor definitions across all ages.
 */

import type { GovernorDef } from '../../types/Governor';
import { ALL_ANTIQUITY_GOVERNORS } from './antiquity-governors';
import { ALL_EXPLORATION_GOVERNORS } from './exploration-governors';
import { ALL_MODERN_GOVERNORS } from './modern-governors';

/**
 * All governors in the game
 */
export const ALL_GOVERNORS: ReadonlyArray<GovernorDef> = [
  ...ALL_ANTIQUITY_GOVERNORS,
  ...ALL_EXPLORATION_GOVERNORS,
  ...ALL_MODERN_GOVERNORS,
];
