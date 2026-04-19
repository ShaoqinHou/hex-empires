import type { ProjectDef } from '../../types/Project';

/**
 * Operation Ivy — Modern age Military project chain, step 2 (terminal).
 *
 * Requires Manhattan Project to be completed first.
 * Completing this project triggers the Military victory.
 *
 * GDD ref: systems/victory-paths.md § "Ideology (Military) → Operation Ivy"
 * W5-01
 */
export const OPERATION_IVY: ProjectDef = {
  id: 'operation_ivy',
  name: 'Operation Ivy',
  age: 'modern',
  cost: 2000,
  requiredTech: 'nuclear_fission',
  requiredProject: 'manhattan_project',
  requiredBuilding: null,
  requiredIdeologyPoints: 0,
  effects: [],
  isSpaceMilestone: false,
  isMilitaryTerminal: true,
  description: 'The culmination of nuclear dominance. Requires the Manhattan Project. Achieves Military Victory.',
} as const;
