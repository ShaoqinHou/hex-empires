export type { BuildingDef } from './antiquity-buildings';
export {
  ALL_ANTIQUITY_BUILDINGS,
  GRANARY, MONUMENT, WALLS, BARRACKS, LIBRARY,
  MARKET, WATERMILL, WORKSHOP, SHRINE,
} from './antiquity-buildings';
export {
  ALL_EXPLORATION_BUILDINGS,
  BANK, UNIVERSITY, STOCK_EXCHANGE, ARMORY, STAR_FORT, SHIPYARD, CATHEDRAL,
} from './exploration-buildings';
export {
  ALL_MODERN_BUILDINGS,
  FACTORY, RESEARCH_LAB, POWER_PLANT, NUCLEAR_PLANT, BROADCAST_TOWER, HOSPITAL, AIRPORT,
} from './modern-buildings';

import { ALL_ANTIQUITY_BUILDINGS } from './antiquity-buildings';
import { ALL_EXPLORATION_BUILDINGS } from './exploration-buildings';
import { ALL_MODERN_BUILDINGS } from './modern-buildings';
import type { BuildingDef } from './antiquity-buildings';

export const ALL_BUILDINGS: ReadonlyArray<BuildingDef> = [
  ...ALL_ANTIQUITY_BUILDINGS,
  ...ALL_EXPLORATION_BUILDINGS,
  ...ALL_MODERN_BUILDINGS,
];
