import type { ProjectDef } from '../../types/Project';

/**
 * Manhattan Project — Modern age Military project chain, step 1.
 *
 * Requires 20 ideology points (accumulated via conquests scaled by ideology).
 * Unlocks the Operation Ivy follow-on project.
 *
 * GDD ref: systems/victory-paths.md § "Ideology (Military) → Operation Ivy"
 * W5-01
 */
export const MANHATTAN_PROJECT: ProjectDef = {
  id: 'manhattan_project',
  name: 'Manhattan Project',
  age: 'modern',
  cost: 1500,
  requiredTech: 'nuclear_fission',
  requiredProject: null,
  requiredBuilding: null,
  requiredIdeologyPoints: 20,
  effects: [],
  isSpaceMilestone: false,
  isMilitaryTerminal: false,
  description: 'Harness nuclear science for military supremacy. Requires 20 Ideology Points and Nuclear Fission. Unlocks Operation Ivy.',
} as const;
