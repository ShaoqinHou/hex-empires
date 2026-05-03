/**
 * Commander Aura resolver — F-04 base aura scaffold.
 *
 * Every commander projects a base aura: +1 combat strength to friendly
 * military units within 2 hexes. Promotion-based auras (defined in
 * AuraEffectDef) are additive on top of this base.
 *
 * This module is pure — reads state, returns a numeric bonus. No side
 * effects, no DOM, no Math.random().
 *
 * AURA_MODIFY_CS promotion stacking is resolved here with UnitCategory target
 * filtering and optional attack/defense conditions. Other aura kinds are
 * resolved by their owning systems as they come online.
 */

import type { GameState, UnitState } from '../types/GameState';
import type { AuraTarget, CommanderState } from '../types/Commander';
import { distance } from '../hex/HexMath';
import { unitIsStationedOnDistrict } from './DistrictStationing';

type AuraTargetUnit = Pick<UnitState, 'id' | 'typeId' | 'owner' | 'position'> & {
  readonly fortified?: boolean;
};

type CommanderHealScope = 'enemy_territory' | 'neutral_territory' | 'enemy_or_neutral_territory';

interface CommanderAuraCombatContext {
  readonly isAttacking?: boolean;
}

/** Base aura radius in hex rings before any AURA_EXPAND_RADIUS picks. */
const BASE_AURA_RADIUS = 2;

/** Base combat bonus projected by every commander. */
const BASE_COMBAT_BONUS = 3;

/**
 * Returns the total commander aura combat bonus for a unit at the given
 * position owned by the given player.
 *
 * Sums the base combat aura plus active AURA_MODIFY_CS promotions projected by
 * friendly commanders. Returns 0 when no commanders map exists or no
 * commanders are in range.
 */
export function getCommanderAuraCombatBonus(
  state: GameState,
  unit: AuraTargetUnit,
  context: CommanderAuraCombatContext = {},
): number {
  if (!state.commanders) return 0;

  let bonus = 0;
  for (const [commanderId, commanderState] of state.commanders) {
    const commanderUnit = state.units.get(commanderId);
    if (!commanderUnit) continue;
    if (commanderUnit.owner !== unit.owner) continue;
    if (distance(commanderUnit.position, unit.position) <= BASE_AURA_RADIUS) {
      bonus += BASE_COMBAT_BONUS;
    }

    const promotionIds = getCommanderPromotionIds(commanderUnit, commanderState);
    for (const promotionId of promotionIds) {
      const promotion = state.config.commanderPromotions?.get(promotionId);
      if (promotion?.aura.type !== 'AURA_MODIFY_CS') continue;
      const aura = promotion.aura;
      if (aura.condition === 'attacking' && context.isAttacking !== true) continue;
      if (aura.condition === 'defending' && context.isAttacking !== false) continue;
      if (aura.requiresDistrict === true && !unitIsStationedOnDistrict(state, unit)) continue;
      if (aura.requiresFortified === true && unit.fortified !== true) continue;
      if (!auraTargetMatches(state, unit, aura.target)) continue;
      if (distance(commanderUnit.position, unit.position) <= aura.radius) {
        bonus += aura.value;
      }
    }
  }
  return bonus;
}

export function getCommanderAuraHealPerTurnAmount(
  state: GameState,
  unit: AuraTargetUnit,
  territoryScope: CommanderHealScope,
): number {
  if (!state.commanders) return 0;

  let amount = 0;
  for (const [commanderId, commanderState] of state.commanders) {
    const commanderUnit = state.units.get(commanderId);
    if (!commanderUnit) continue;
    if (commanderUnit.owner !== unit.owner) continue;

    const promotionIds = getCommanderPromotionIds(commanderUnit, commanderState);
    for (const promotionId of promotionIds) {
      const promotion = state.config.commanderPromotions?.get(promotionId);
      if (promotion?.aura.type !== 'AURA_HEAL_PER_TURN') continue;
      if (!auraTargetMatches(state, unit, promotion.aura.target)) continue;
      if (promotion.aura.territoryScope !== undefined
        && !doesHealTerritoryMatch(promotion.aura.territoryScope, territoryScope)
      ) {
        continue;
      }
      if (distance(commanderUnit.position, unit.position) > promotion.aura.radius) continue;

      amount = Math.max(amount, promotion.aura.amount);
    }
  }

  return amount;
}

function doesHealTerritoryMatch(
  auraScope: CommanderHealScope,
  unitScope: CommanderHealScope,
): boolean {
  if (auraScope === 'enemy_or_neutral_territory') {
    return unitScope === 'enemy_territory' || unitScope === 'neutral_territory';
  }
  return auraScope === unitScope;
}

function getCommanderPromotionIds(
  commanderUnit: UnitState,
  commanderState: CommanderState,
): ReadonlySet<string> {
  return new Set([
    ...commanderState.promotions,
    ...commanderUnit.promotions,
  ]);
}

function auraTargetMatches(
  state: GameState,
  unit: AuraTargetUnit,
  target: AuraTarget | ReadonlyArray<AuraTarget>,
): boolean {
  const targets = Array.isArray(target) ? target : [target];
  if (targets.includes('all')) return true;

  const category = state.config.units.get(unit.typeId)?.category;
  return category !== undefined && targets.includes(category);
}

export function hasCommanderGrantedAbility(
  state: GameState,
  unit: AuraTargetUnit,
  abilityId: string,
): boolean {
  if (!state.commanders) return false;

  for (const [commanderId, commanderState] of state.commanders) {
    const commanderUnit = state.units.get(commanderId);
    if (!commanderUnit) continue;
    if (commanderUnit.id === unit.id) continue;
    if (commanderUnit.owner !== unit.owner) continue;

    const promotionIds = getCommanderPromotionIds(commanderUnit, commanderState);
    for (const promotionId of promotionIds) {
      const promotion = state.config.commanderPromotions?.get(promotionId);
      if (promotion?.aura.type !== 'AURA_GRANT_ABILITY') continue;
      if (promotion.aura.abilityId !== abilityId) continue;
      if (!auraTargetMatches(state, unit, promotion.aura.target)) continue;
      if (distance(commanderUnit.position, unit.position) <= promotion.aura.radius) {
        return true;
      }
    }
  }

  return false;
}

export function getCommanderAuraHealAfterAttackAmount(
  state: GameState,
  unit: AuraTargetUnit,
): number {
  if (!state.commanders) return 0;

  let amount = 0;
  for (const [commanderId, commanderState] of state.commanders) {
    const commanderUnit = state.units.get(commanderId);
    if (!commanderUnit) continue;
    if (commanderUnit.owner !== unit.owner) continue;

    const promotionIds = getCommanderPromotionIds(commanderUnit, commanderState);
    for (const promotionId of promotionIds) {
      const promotion = state.config.commanderPromotions?.get(promotionId);
      if (promotion?.aura.type !== 'AURA_HEAL_AFTER_ATTACK') continue;
      if (!auraTargetMatches(state, unit, promotion.aura.target)) continue;
      if (distance(commanderUnit.position, unit.position) <= promotion.aura.radius) {
        amount = Math.max(amount, promotion.aura.amount);
      }
    }
  }

  return amount;
}
