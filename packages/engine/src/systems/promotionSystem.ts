import type { GameState, GameAction, UnitState } from '../types/GameState';
import { PROMOTION_THRESHOLDS } from '../data/units/promotions';
import type { PromotionDef } from '../data/units/promotions';

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

/**
 * Get the total combat bonus from a unit's active promotions.
 * Used by combatSystem to modify combat strength calculations.
 */
export function getPromotionCombatBonus(
  state: GameState,
  unit: UnitState,
  context: {
    readonly isAttacking: boolean;
    readonly targetWounded?: boolean;
    readonly targetFortified?: boolean;
    readonly adjacentAlly?: boolean;
    readonly targetIsWalls?: boolean;
  },
): number {
  let bonus = 0;

  for (const promoId of unit.promotions) {
    const promoDef = state.config.promotions.get(promoId);
    if (!promoDef) continue;

    for (const effect of promoDef.effects) {
      switch (effect.type) {
        case 'COMBAT_BONUS':
          bonus += effect.value;
          break;
        case 'COMBAT_VS_WOUNDED':
          if (context.targetWounded) bonus += effect.value;
          break;
        case 'COMBAT_ATTACKING':
          if (context.isAttacking) bonus += effect.value;
          break;
        case 'COMBAT_ADJACENT_ALLY':
          if (context.adjacentAlly) bonus += effect.value;
          break;
        case 'COMBAT_VS_WALLS':
          if (context.targetIsWalls) bonus += effect.value;
          break;
        case 'RANGED_VS_FORTIFIED':
          if (context.targetFortified) bonus += effect.value;
          break;
        case 'RANGED_COMBAT':
          bonus += effect.value;
          break;
        case 'DEFENSE_FORTIFIED':
          // Handled separately when calculating defense
          break;
      }
    }
  }

  return bonus;
}

/**
 * Get defense bonus from promotions when unit is fortified.
 */
export function getPromotionDefenseBonus(state: GameState, unit: UnitState): number {
  let bonus = 0;

  if (!unit.fortified) return 0;

  for (const promoId of unit.promotions) {
    const promoDef = state.config.promotions.get(promoId);
    if (!promoDef) continue;

    for (const effect of promoDef.effects) {
      if (effect.type === 'DEFENSE_FORTIFIED') {
        bonus += effect.value;
      }
    }
  }

  return bonus;
}

/**
 * Get bonus range from promotions (e.g., Arrows: +1 range).
 */
export function getPromotionRangeBonus(state: GameState, unit: UnitState): number {
  let bonus = 0;

  for (const promoId of unit.promotions) {
    const promoDef = state.config.promotions.get(promoId);
    if (!promoDef) continue;

    for (const effect of promoDef.effects) {
      if (effect.type === 'BONUS_RANGE') {
        bonus += effect.value;
      }
    }
  }

  return bonus;
}

/**
 * Get bonus movement from promotions (e.g., Pursuit: +1 movement).
 */
export function getPromotionMovementBonus(state: GameState, unit: UnitState): number {
  let bonus = 0;

  for (const promoId of unit.promotions) {
    const promoDef = state.config.promotions.get(promoId);
    if (!promoDef) continue;

    for (const effect of promoDef.effects) {
      if (effect.type === 'BONUS_MOVEMENT') {
        bonus += effect.value;
      }
    }
  }

  return bonus;
}
