export type { UnitDef } from './antiquity-units';
export {
  ALL_ANTIQUITY_UNITS,
  WARRIOR, SLINGER, ARCHER, SCOUT, SPEARMAN,
  CHARIOT, SETTLER, BUILDER, BATTERING_RAM, GALLEY, MERCHANT,
} from './antiquity-units';
export {
  ALL_EXPLORATION_UNITS,
  SWORDSMAN, CROSSBOWMAN, PIKEMAN, HORSEMAN, KNIGHT,
  MUSKETMAN, BOMBARD, CANNON, SIEGE_TOWER, CARAVEL,
} from './exploration-units';
export {
  ALL_MODERN_UNITS,
  INFANTRY, MACHINE_GUN, TANK, FIGHTER,
  ROCKET_ARTILLERY, IRONCLAD, BIPLANE,
} from './modern-units';

import { ALL_ANTIQUITY_UNITS } from './antiquity-units';
import { ALL_EXPLORATION_UNITS } from './exploration-units';
import { ALL_MODERN_UNITS } from './modern-units';
import type { UnitDef } from './antiquity-units';

export const ALL_UNITS: ReadonlyArray<UnitDef> = [
  ...ALL_ANTIQUITY_UNITS,
  ...ALL_EXPLORATION_UNITS,
  ...ALL_MODERN_UNITS,
];

// Promotion exports
export type { PromotionDef } from './promotions';
export {
  ALL_PROMOTIONS, PROMOTION_THRESHOLDS,
  BATTLECRY, TORTOISE, VOLLEY, ARROWS, CHARGE, PURSUIT,
  BLITZ, LOGISTICS, FLANKING, BREAKTHROUGH, ELITE,
} from './promotions';
