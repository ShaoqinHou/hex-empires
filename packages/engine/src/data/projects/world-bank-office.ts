import type { ProjectDef } from '../../types/Project';

/**
 * World Bank Office — Modern age Economic project.
 *
 * Dispatched via COMPLETE_PROJECT with cost 0 (the Great Banker unit establishes
 * it via visit to a rival capital; the action is triggered by the player rather
 * than by city production). Each rival capital must have an office established.
 * When worldBankOfficesRemaining reaches 0, victorySystem detects Economic Victory.
 *
 * GDD ref: systems/victory-paths.md § "Railroad Tycoon (Economic) → World Bank"
 * W5-01
 */
export const WORLD_BANK_OFFICE: ProjectDef = {
  id: 'world_bank_office',
  name: 'World Bank Office',
  age: 'modern',
  cost: 0,
  requiredTech: 'electricity',
  requiredProject: null,
  requiredBuilding: null,
  requiredIdeologyPoints: 0,
  effects: [],
  isSpaceMilestone: false,
  isMilitaryTerminal: false,
  description: 'Establish a World Bank Office in a rival capital. Requires 500 Railroad Tycoon Points and all rival capitals visited to achieve Economic Victory.',
} as const;
