import type { GameState, GameAction, UnitState, HexTile } from '../types/GameState';
import { coordToKey, neighbors, distance } from '../hex/HexMath';

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

  // Check range
  const dist = distance(attacker.position, defender.position);
  const attackerRange = getUnitRange(attacker.typeId);

  if (attackerRange === 0) {
    // Melee: must be adjacent
    if (dist !== 1) return state;
  } else {
    // Ranged: must be within range
    if (dist > attackerRange || dist === 0) return state;
  }

  // Calculate effective strengths
  const defenderTile = state.map.tiles.get(coordToKey(defender.position));
  const attackerStrength = getEffectiveCombatStrength(attacker, state, true);
  const defenderStrength = getEffectiveDefenseStrength(defender, defenderTile ?? null, state);

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
function getEffectiveCombatStrength(unit: UnitState, state: GameState, isAttacking: boolean): number {
  const base = getBaseCombatStrength(unit.typeId, isAttacking);
  const healthModifier = unit.health / 100; // damaged units fight worse
  const flankingBonus = isAttacking ? calculateFlankingBonus(unit, state) : 0;
  return base * healthModifier + flankingBonus;
}

/** Get effective defense strength with terrain and fortification bonuses */
function getEffectiveDefenseStrength(unit: UnitState, tile: HexTile | null, state: GameState): number {
  const base = getBaseCombatStrength(unit.typeId, false);
  const healthModifier = unit.health / 100;
  let strength = base * healthModifier;

  // Terrain defense bonus
  if (tile) {
    const terrainBonus = getTerrainDefenseBonus(tile);
    strength *= (1 + terrainBonus);
  }

  // Fortification bonus (+50% when fortified)
  if (unit.fortified) {
    strength *= 1.5;
  }

  return strength;
}

function getBaseCombatStrength(typeId: string, isRangedAttack: boolean): number {
  // Ranged units use rangedCombat when attacking, combat when defending
  const stats: Record<string, { combat: number; rangedCombat: number }> = {
    warrior: { combat: 20, rangedCombat: 0 },
    slinger: { combat: 5, rangedCombat: 15 },
    archer: { combat: 10, rangedCombat: 25 },
    scout: { combat: 10, rangedCombat: 0 },
    spearman: { combat: 25, rangedCombat: 0 },
    chariot: { combat: 25, rangedCombat: 0 },
    battering_ram: { combat: 12, rangedCombat: 0 },
    galley: { combat: 25, rangedCombat: 0 },
    // Exploration units
    musketman: { combat: 50, rangedCombat: 0 },
    knight: { combat: 48, rangedCombat: 0 },
    crossbowman: { combat: 30, rangedCombat: 40 },
    bombard: { combat: 10, rangedCombat: 45 },
    cannon: { combat: 15, rangedCombat: 55 },
    // Modern units
    infantry: { combat: 70, rangedCombat: 0 },
    machine_gun: { combat: 45, rangedCombat: 60 },
    tank: { combat: 80, rangedCombat: 0 },
    fighter: { combat: 60, rangedCombat: 75 },
    rocket_artillery: { combat: 20, rangedCombat: 85 },
  };

  const s = stats[typeId] ?? { combat: 15, rangedCombat: 0 };
  if (isRangedAttack && s.rangedCombat > 0) return s.rangedCombat;
  return s.combat;
}

function getUnitRange(typeId: string): number {
  const ranges: Record<string, number> = {
    slinger: 1,
    archer: 2,
    crossbowman: 2,
    bombard: 2,
    cannon: 2,
    machine_gun: 2,
    fighter: 3,
    rocket_artillery: 3,
  };
  return ranges[typeId] ?? 0;
}

function getTerrainDefenseBonus(tile: HexTile): number {
  let bonus = 0;
  // Terrain base defense
  const terrainBonuses: Record<string, number> = {
    grassland: 0, plains: 0, desert: 0, tundra: 0, snow: 0,
  };
  bonus += terrainBonuses[tile.terrain] ?? 0;

  // Feature defense bonus
  if (tile.feature) {
    const featureBonuses: Record<string, number> = {
      hills: 0.3,
      forest: 0.25,
      jungle: 0.25,
      marsh: -0.15,
    };
    bonus += featureBonuses[tile.feature] ?? 0;
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
