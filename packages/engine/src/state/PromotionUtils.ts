import type { GameState, UnitState } from '../types/GameState';

/**
 * Promotion query utilities.
 * Shared by promotionSystem and combatSystem to avoid cross-system imports.
 * These are pure functions that read promotion data from GameState.config.
 */

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
          // Handled separately via getPromotionDefenseBonus
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
