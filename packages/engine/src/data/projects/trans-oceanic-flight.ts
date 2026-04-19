import type { ProjectDef } from '../../types/Project';

/**
 * Trans-Oceanic Flight — Space Race, milestone 1 of 3.
 *
 * Requires Flight tech and an Aerodrome building in the completing city.
 * Awards spaceMilestonesComplete +1.
 *
 * GDD ref: systems/victory-paths.md § "Space Race (Scientific) → First Staffed Space Flight"
 * W5-01
 */
export const TRANS_OCEANIC_FLIGHT: ProjectDef = {
  id: 'trans_oceanic_flight',
  name: 'Trans-Oceanic Flight',
  age: 'modern',
  cost: 800,
  requiredTech: 'flight',
  requiredProject: null,
  requiredBuilding: 'airport',
  requiredIdeologyPoints: 0,
  effects: [],
  isSpaceMilestone: true,
  isMilitaryTerminal: false,
  description: 'Pioneer long-range aerial navigation. Requires Flight and an Airport. Advances the Space Race (1/3).',
} as const;
