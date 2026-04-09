import type { GameState, GameAction, UnitState } from '../types/GameState';
import { PROMOTION_THRESHOLDS } from '../data/units/promotions';

/**
 * PromotionSystem handles PROMOTE_UNIT actions.
 *
 * Validates:
 * - Unit exists and belongs to current player
 * - Promotion exists in config
 * - Unit has enough XP for the promotion tier
 * - Unit's category matches the promotion category (or promotion is 'all')
 * - Unit doesn't already have this promotion
 *
 * On success: adds promotion ID to unit.promotions, deducts XP threshold.
 * If promotion has HEAL_ON_PROMOTE effect, fully heals the unit.
 */
export function promotionSystem(state: GameState, action: GameAction): GameState {
  if (action.type !== 'PROMOTE_UNIT') return state;

  const unit = state.units.get(action.unitId);
  if (!unit) return state;
  if (unit.owner !== state.currentPlayerId) return state;

  // Look up promotion definition from config
  const promotionDef = state.config.promotions.get(action.promotionId);
  if (!promotionDef) return state;

  // Check unit category matches (or promotion is for 'all')
  const unitDef = state.config.units.get(unit.typeId);
  if (!unitDef) return state;
  if (promotionDef.category !== 'all' && promotionDef.category !== unitDef.category) return state;

  // Check unit doesn't already have this promotion
  if (unit.promotions.includes(action.promotionId)) return state;

  // Check unit has enough XP for this tier
  const threshold = PROMOTION_THRESHOLDS[promotionDef.tier];
  if (unit.experience < threshold) return state;

  // Apply promotion
  let updatedUnit: UnitState = {
    ...unit,
    promotions: [...unit.promotions, action.promotionId],
    experience: unit.experience - threshold,
  };

  // Check for HEAL_ON_PROMOTE effect
  const hasHeal = promotionDef.effects.some(e => e.type === 'HEAL_ON_PROMOTE');
  if (hasHeal) {
    updatedUnit = { ...updatedUnit, health: 100 };
  }

  const updatedUnits = new Map(state.units);
  updatedUnits.set(action.unitId, updatedUnit);

  const logEntries = [...state.log, {
    turn: state.turn,
    playerId: state.currentPlayerId,
    message: `${unitDef.name} earned the ${promotionDef.name} promotion`,
    type: 'combat' as const,
  }];

  return {
    ...state,
    units: updatedUnits,
    log: logEntries,
  };
}
