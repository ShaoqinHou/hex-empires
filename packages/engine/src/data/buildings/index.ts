export type { BuildingDef } from './antiquity-buildings';
export {
  ALL_ANTIQUITY_BUILDINGS,
  GRANARY, MONUMENT, WALLS, BARRACKS, LIBRARY,
  MARKET, WATERMILL, WORKSHOP, SHRINE,
} from './antiquity-buildings';

import { ALL_ANTIQUITY_BUILDINGS } from './antiquity-buildings';
import type { BuildingDef } from './antiquity-buildings';

export const ALL_BUILDINGS: ReadonlyArray<BuildingDef> = [
  ...ALL_ANTIQUITY_BUILDINGS,
];
