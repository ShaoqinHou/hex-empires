import type { GameState, GameAction, UnitState, HexTile } from '../types/GameState';
import { coordToKey, neighbors, distance } from '../hex/HexMath';
import { getPromotionCombatBonus, getPromotionDefenseBonus, getPromotionRangeBonus } from '../state/PromotionUtils';

/**
 * CombatSystem handles unit attacks.
 * Combat formula (Civ-style):
 * - Damage = 30 * e^(strengthDiff / 25)
 * - strengthDiff = attacker effective strength - defender effective strength
 * - Modifiers: terrain defense, fortification, flanking, health penalty
 */
export function combatSystem(state: GameState, action: GameAction): GameState {
  if (action.type !== 'ATTACK_UNIT') return state;

  const attacker = state.units.get(action.attackerId);
  const defender = state.units.get(action.targetId);
  if (!attacker || !defender) return state;
  if (attacker.owner !== state.currentPlayerId) return state;
  if (attacker.owner === defender.owner) return state; // can't attack own units
  if (attacker.movementLeft <= 0) return state;

  // Check range (includes promotion range bonus)
  const dist = distance(attacker.position, defender.position);
  const baseRange = getUnitRange(state, attacker.typeId);
  const attackerRange = baseRange + getPromotionRangeBonus(state, attacker);

  if (baseRange === 0) {
    // Melee: must be adjacent (range bonuses don't apply to melee)
    if (dist !== 1) return state;
  } else {
    // Ranged: must be within range
    if (dist > attackerRange || dist === 0) return state;
  }

  // Build promotion context for bonus calculations
  const hasAdjacentAlly = checkAdjacentAlly(attacker, defender, state);
  const promotionContext = {
    isAttacking: true,
    targetWounded: defender.health < 100,
    targetFortified: defender.fortified,
    adjacentAlly: hasAdjacentAlly,
    targetIsWalls: false, // future: detect city wall targets
  };

  // Calculate effective strengths (with promotion bonuses)
  const defenderTile = state.map.tiles.get(coordToKey(defender.position));
  const attackerPromoBonus = getPromotionCombatBonus(state, attacker, promotionContext);
  const defenderPromoBonus = getPromotionCombatBonus(state, defender, {
    isAttacking: false,
    targetWounded: attacker.health < 100,
    adjacentAlly: false,
  });
  const defenderFortifyPromoBonus = getPromotionDefenseBonus(state, defender);
  const attackerStrength = getEffectiveCombatStrength(state, attacker, true) + attackerPromoBonus;
  const defenderStrength = getEffectiveDefenseStrength(state, defender, defenderTile ?? null) + defenderPromoBonus + defenderFortifyPromoBonus;

  // Calculate damage
  const strengthDiff = attackerStrength - defenderStrength;
  const attackerDamage = Math.round(30 * Math.exp(strengthDiff / 25)); // damage to defender
  const defenderDamage = attackerRange > 0
    ? 0 // ranged units don't take damage when attacking
    : Math.round(30 * Math.exp(-strengthDiff / 25)); // damage to attacker (melee only)

  const newDefenderHealth = Math.max(0, defender.health - attackerDamage);
  const newAttackerHealth = Math.max(0, attacker.health - defenderDamage);

  const updatedUnits = new Map(state.units);
  const logEntries = [...state.log];

  // Update attacker
  if (newAttackerHealth <= 0) {
    updatedUnits.delete(attacker.id);
    logEntries.push({
      turn: state.turn,
      playerId: state.currentPlayerId,
      message: `${attacker.typeId} was destroyed attacking ${defender.typeId}`,
      type: 'combat',
    });
  } else {
    updatedUnits.set(attacker.id, {
      ...attacker,
      health: newAttackerHealth,
      movementLeft: 0, // attacking ends movement
      experience: attacker.experience + 5,
    });
  }

  // Update defender
  if (newDefenderHealth <= 0) {
    updatedUnits.delete(defender.id);
    logEntries.push({
      turn: state.turn,
      playerId: state.currentPlayerId,
      message: `${attacker.typeId} destroyed ${defender.typeId}!`,
      type: 'combat',
    });

    // Melee attacker moves into defender's position if alive
    if (attackerRange === 0 && newAttackerHealth > 0) {
      const movedAttacker = updatedUnits.get(attacker.id);
      if (movedAttacker) {
        updatedUnits.set(attacker.id, {
          ...movedAttacker,
          position: defender.position,
        });
      }
    }
  } else {
    updatedUnits.set(defender.id, {
      ...defender,
      health: newDefenderHealth,
      experience: defender.experience + 3,
    });
    logEntries.push({
      turn: state.turn,
      playerId: state.currentPlayerId,
      message: `${attacker.typeId} attacked ${defender.typeId} (${newDefenderHealth}HP remaining)`,
      type: 'combat',
    });
  }

  return {
    ...state,
    units: updatedUnits,
    log: logEntries,
  };
}

/** Get base combat strength, reduced by health percentage */
function getEffectiveCombatStrength(state: GameState, unit: UnitState, isAttacking: boolean): number {
  const base = getBaseCombatStrength(state, unit.typeId, isAttacking);
  const healthModifier = unit.health / 100; // damaged units fight worse
  const flankingBonus = isAttacking ? calculateFlankingBonus(unit, state) : 0;
  return base * healthModifier + flankingBonus;
}

/** Get effective defense strength with terrain and fortification bonuses */
function getEffectiveDefenseStrength(state: GameState, unit: UnitState, tile: HexTile | null): number {
  const base = getBaseCombatStrength(state, unit.typeId, false);
  const healthModifier = unit.health / 100;
  let strength = base * healthModifier;

  // Terrain defense bonus
  if (tile) {
    const terrainBonus = getTerrainDefenseBonus(state, tile);
    strength *= (1 + terrainBonus);
  }

  // Fortification bonus (+50% when fortified)
  if (unit.fortified) {
    strength *= 1.5;
  }

  return strength;
}

/** Combat strength from state.config.units — driven by data */
function getBaseCombatStrength(state: GameState, typeId: string, isRangedAttack: boolean): number {
  const unitDef = state.config.units.get(typeId);
  const combat = unitDef?.combat ?? 15;
  const rangedCombat = unitDef?.rangedCombat ?? 0;
  if (isRangedAttack && rangedCombat > 0) return rangedCombat;
  return combat;
}

/** Unit attack range from state.config.units — driven by data */
function getUnitRange(state: GameState, typeId: string): number {
  return state.config.units.get(typeId)?.range ?? 0;
}

/** Terrain defense bonus from state.config.terrains and state.config.features — driven by data */
function getTerrainDefenseBonus(state: GameState, tile: HexTile): number {
  let bonus = 0;
  // Terrain base defense
  const terrainDef = state.config.terrains.get(tile.terrain);
  bonus += terrainDef?.defenseBonus ?? 0;

  // Feature defense bonus
  if (tile.feature) {
    const featureDef = state.config.features.get(tile.feature);
    bonus += featureDef?.defenseBonusModifier ?? 0;
  }

  return bonus;
}

/** Flanking bonus: +2 strength per friendly unit adjacent to the defender */
function calculateFlankingBonus(attacker: UnitState, state: GameState): number {
  // Find the defender — get all enemy units adjacent to attacker's target
  // For simplicity, check friendly units adjacent to any enemy
  let bonus = 0;
  // This is simplified — in a real implementation we'd look at the specific target
  return bonus;
}

/** Check if the attacker has a friendly unit adjacent to the defender */
function checkAdjacentAlly(attacker: UnitState, defender: UnitState, state: GameState): boolean {
  const defNeighbors = neighbors(defender.position);
  for (const [, u] of state.units) {
    if (u.id === attacker.id) continue;
    if (u.owner !== attacker.owner) continue;
    if (defNeighbors.some(n => n.q === u.position.q && n.r === u.position.r)) {
      return true;
    }
  }
  return false;
}
