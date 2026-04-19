import type { ProjectDef } from '../../types/Project';

/**
 * Break Sound Barrier — Space Race, milestone 2 of 3.
 *
 * Requires Trans-Oceanic Flight to be completed first.
 * Awards spaceMilestonesComplete +1.
 *
 * GDD ref: systems/victory-paths.md § "Space Race (Scientific) → First Staffed Space Flight"
 * W5-01
 */
export const BREAK_SOUND_BARRIER: ProjectDef = {
  id: 'break_sound_barrier',
  name: 'Break Sound Barrier',
  age: 'modern',
  cost: 1000,
  requiredTech: 'combined_arms',
  requiredProject: 'trans_oceanic_flight',
  requiredBuilding: 'airport',
  requiredIdeologyPoints: 0,
  effects: [],
  isSpaceMilestone: true,
  isMilitaryTerminal: false,
  description: 'Push beyond the sound barrier. Requires Trans-Oceanic Flight and an Airport. Advances the Space Race (2/3).',
} as const;
