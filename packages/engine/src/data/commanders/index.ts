/**
 * Commander data barrel — Cycle B.
 *
 * Intentionally NOT re-exported from the engine-level barrel yet.
 * Keeping this private avoids the runtime seeing commander data
 * before `commanderPromotionSystem` ships in cycle C. Importers
 * inside tests and future systems should reach in explicitly.
 */

export {
  CAPTAIN,
  GENERAL,
  ADMIRAL,
  MARSHAL,
  FLEET_ADMIRAL,
  ALL_COMMANDERS,
} from './commanders';
export type { CommanderRole, CommanderUnitDef } from './commanders';

export {
  ALL_COMMANDER_PROMOTIONS,
  COMMANDER_PROMOTION_XP_COST,
} from './promotion-trees';
export type { CommanderPromotionEntry } from './promotion-trees';
