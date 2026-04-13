import type { GameState, ActiveEffect } from '../types/GameState';

/**
 * Collect all active effects for a player from:
 * 1. Current civilization's unique ability
 * 2. Leader's ability (always active)
 * 3. Legacy bonuses (from previous age civs)
 */
export function getActiveEffects(state: GameState, playerId: string): ReadonlyArray<ActiveEffect> {
  const player = state.players.get(playerId);
  if (!player) return [];

  const effects: ActiveEffect[] = [];

  // 1. Current civilization ability
  const civ = state.config.civilizations.get(player.civilizationId);
  if (civ) {
    for (const effect of civ.uniqueAbility.effects) {
      effects.push({ source: `civ:${civ.id}`, effect });
    }
  }

  // 2. Leader ability (always active across all ages)
  const leader = state.config.leaders.get(player.leaderId);
  if (leader) {
    for (const effect of leader.ability.effects) {
      effects.push({ source: `leader:${leader.id}`, effect });
    }
  }

  // 3. Legacy bonuses (accumulated from previous age transitions)
  for (const legacy of player.legacyBonuses) {
    effects.push(legacy);
  }

  return effects;
}

/**
 * Sum all MODIFY_YIELD effects for the 'empire' target for a specific yield type.
 * Returns the flat bonus to add to each city's yield.
 */
export function getYieldBonus(
  state: GameState,
  playerId: string,
  yieldType: string,
): number {
  const effects = getActiveEffects(state, playerId);
  let bonus = 0;
  for (const active of effects) {
    if (
      active.effect.type === 'MODIFY_YIELD' &&
      active.effect.target === 'empire' &&
      active.effect.yield === yieldType
    ) {
      bonus += active.effect.value;
    }
  }
  return bonus;
}

/**
 * Sum all MODIFY_COMBAT effects for a given unit category (or 'all').
 * Returns the flat combat strength bonus.
 */
export function getCombatBonus(
  state: GameState,
  playerId: string,
  unitCategory: string,
): number {
  const effects = getActiveEffects(state, playerId);
  let bonus = 0;
  for (const active of effects) {
    if (active.effect.type === 'MODIFY_COMBAT') {
      if (active.effect.target === 'all' || active.effect.target === unitCategory) {
        bonus += active.effect.value;
      }
    }
  }
  return bonus;
}

/**
 * Sum all MODIFY_MOVEMENT effects for a given unit category (or 'all').
 * Returns the flat movement bonus.
 */
export function getMovementBonus(
  state: GameState,
  playerId: string,
  unitCategory: string,
): number {
  const effects = getActiveEffects(state, playerId);
  let bonus = 0;
  for (const active of effects) {
    if (active.effect.type === 'MODIFY_MOVEMENT') {
      if (active.effect.target === 'all' || active.effect.target === unitCategory) {
        bonus += active.effect.value;
      }
    }
  }
  return bonus;
}

/**
 * Get production discount percentage for a target (e.g., 'wonder').
 */
export function getProductionDiscount(
  state: GameState,
  playerId: string,
  target: string,
): number {
  const effects = getActiveEffects(state, playerId);
  let discount = 0;
  for (const active of effects) {
    if (active.effect.type === 'DISCOUNT_PRODUCTION' && active.effect.target === target) {
      discount += active.effect.percent;
    }
  }
  return discount;
}
