export type { CivilizationDef } from './types';
export { ALL_ANTIQUITY_CIVS, ROME, EGYPT, GREECE, PERSIA, INDIA, CHINA } from './antiquity-civs';

import type { CivilizationDef } from './types';
import { ALL_ANTIQUITY_CIVS } from './antiquity-civs';

export const ALL_CIVILIZATIONS: ReadonlyArray<CivilizationDef> = [
  ...ALL_ANTIQUITY_CIVS,
];
