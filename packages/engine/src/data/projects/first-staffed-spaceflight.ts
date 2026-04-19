import type { ProjectDef } from '../../types/Project';

/**
 * First Staffed Space Flight — Space Race, milestone 3 of 3 (terminal).
 *
 * Requires Break Sound Barrier and Rocketry tech.
 * Awards spaceMilestonesComplete +1; with spaceMilestonesComplete >= 3 the
 * victorySystem detects Science Victory.
 *
 * GDD ref: systems/victory-paths.md § "Space Race (Scientific) → First Staffed Space Flight"
 * W5-01
 */
export const FIRST_STAFFED_SPACEFLIGHT: ProjectDef = {
  id: 'first_staffed_spaceflight',
  name: 'First Staffed Space Flight',
  age: 'modern',
  cost: 1800,
  requiredTech: 'rocketry',
  requiredProject: 'break_sound_barrier',
  requiredBuilding: 'research_lab',
  requiredIdeologyPoints: 0,
  effects: [],
  isSpaceMilestone: true,
  isMilitaryTerminal: false,
  description: 'Launch the first human into space. Requires Break Sound Barrier, Rocketry, and a Research Lab. Achieves Science Victory (3/3).',
} as const;
