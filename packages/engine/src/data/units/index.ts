export type { UnitDef } from './antiquity-units';
export {
  ALL_ANTIQUITY_UNITS,
  WARRIOR, SLINGER, ARCHER, SCOUT, SPEARMAN,
  CHARIOT, SETTLER, BUILDER, BATTERING_RAM, GALLEY,
} from './antiquity-units';

import { ALL_ANTIQUITY_UNITS } from './antiquity-units';
import type { UnitDef } from './antiquity-units';

export const ALL_UNITS: ReadonlyArray<UnitDef> = [
  ...ALL_ANTIQUITY_UNITS,
];
