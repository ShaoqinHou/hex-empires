export type { ProjectDef } from '../../types/Project';

export { MANHATTAN_PROJECT } from './manhattan-project';
export { OPERATION_IVY } from './operation-ivy';
export { TRANS_OCEANIC_FLIGHT } from './trans-oceanic-flight';
export { BREAK_SOUND_BARRIER } from './break-sound-barrier';
export { FIRST_STAFFED_SPACEFLIGHT } from './first-staffed-spaceflight';
export { WORLD_BANK_OFFICE } from './world-bank-office';

import { MANHATTAN_PROJECT } from './manhattan-project';
import { OPERATION_IVY } from './operation-ivy';
import { TRANS_OCEANIC_FLIGHT } from './trans-oceanic-flight';
import { BREAK_SOUND_BARRIER } from './break-sound-barrier';
import { FIRST_STAFFED_SPACEFLIGHT } from './first-staffed-spaceflight';
import { WORLD_BANK_OFFICE } from './world-bank-office';
import type { ProjectDef } from '../../types/Project';

export const ALL_PROJECTS: ReadonlyArray<ProjectDef> = [
  MANHATTAN_PROJECT,
  OPERATION_IVY,
  TRANS_OCEANIC_FLIGHT,
  BREAK_SOUND_BARRIER,
  FIRST_STAFFED_SPACEFLIGHT,
  WORLD_BANK_OFFICE,
];
