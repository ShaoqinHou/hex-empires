export type { CivilizationDef } from './types';
export { ALL_ANTIQUITY_CIVS, ROME, EGYPT, GREECE, PERSIA, INDIA, CHINA, VIKINGS, ASSYRIA, HITTITES, PHOENICIA, KOREA } from './antiquity-civs';
export { ALL_EXPLORATION_CIVS, SPAIN, ENGLAND, FRANCE, OTTOMAN, JAPAN, MONGOLIA, MAYA, NORMANS, PORTUGAL } from './exploration-civs';
export { ALL_MODERN_CIVS, AMERICA, GERMANY, RUSSIA, BRAZIL, MEXICO, SWEDEN, AUSTRALIA } from './modern-civs';

import type { CivilizationDef } from './types';
import { ALL_ANTIQUITY_CIVS } from './antiquity-civs';
import { ALL_EXPLORATION_CIVS } from './exploration-civs';
import { ALL_MODERN_CIVS } from './modern-civs';

export const ALL_CIVILIZATIONS: ReadonlyArray<CivilizationDef> = [
  ...ALL_ANTIQUITY_CIVS,
  ...ALL_EXPLORATION_CIVS,
  ...ALL_MODERN_CIVS,
];
