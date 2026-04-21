import type { GameState, UnitState, HexTile, CityState, RngState } from '../types/GameState';
import type { HexCoord } from '../types/HexCoord';
import { coordToKey, neighbors, distance } from '../hex/HexMath';
import { getPromotionCombatBonus, getPromotionDefenseBonus, getPromotionRangeBonus } from './PromotionUtils';
import { nextRandom } from './SeededRng';
import { computeEffectiveCS } from './CombatAnalytics';

/**
 * Target type for combat preview.
 */
export type CombatTarget = { readonly type: 'unit'; readonly unitId: string } | { readonly type: 'city'; readonly cityId: string };

/**
 * Result of checking if a target can be attacked.
 */
export interface AttackableTarget {
  readonly target: CombatTarget;
  readonly position: HexCoord;
  readonly canAttack: boolean;
  readonly reason?: string;
}

/**
 * Combat preview result showing expected damage outcomes.
 * Returns both expected (average) and min/max values due to randomness.
 */
export interface CombatPreview {
  readonly attackerId: string;
  readonly target: CombatTarget;
  readonly canAttack: boolean;
  readonly reason?: string; // Why attack is not possible
  readonly attackerStrength: number;
  readonly defenderStrength: number;
  readonly strengthDifference: number; // attackerStrength - defenderStrength
  readonly isRanged: boolean;
  readonly expectedDamageToDefender: number;
  readonly minDamageToDefender: number;
  readonly maxDamageToDefender: number;
  readonly expectedDamageToAttacker: number;
  readonly minDamageToAttacker: number;
  readonly maxDamageToAttacker: number;
  readonly defenderWillDie: boolean;
  readonly attackerWillDie: boolean;
  readonly odds: CombatOdds;
  readonly modifiers: CombatModifiers;
}

export interface CombatOdds {
  readonly attackerWinPercent: number; // Chance defender is destroyed
  readonly drawPercent: number; // Chance both survive
  readonly defenderWinPercent: number; // Chance attacker is destroyed
  readonly expectedDefenderHP: number;
  readonly expectedAttackerHP: number;
}

export interface CombatModifiers {
  readonly attackerHealth: number;
  readonly defenderHealth: number;
  readonly attackerFortified: boolean;
  readonly defenderFortified: boolean;
  readonly flankingBonus: number;
  readonly terrainDefenseBonus: number;
  readonly riverPenalty: boolean;
  readonly firstStrikeBonus: boolean;
  readonly warSupportPenalty: number;
  readonly adjacentAlly: boolean;
  readonly targetWounded: boolean;
}

/**
 * Calculate combat preview for an attacker targeting a defender.
 * Does NOT modify state - purely for UI preview.
 */
export function calculateCombatPreview(
  state: GameState,
  attackerId: string,
  defenderId: string,
): CombatPreview {
  const attacker = state.units.get(attackerId);
  const defender = state.units.get(defenderId);

  if (!attacker || !defender) {
    return {
      attackerId,
      target: { type: 'unit', unitId: defenderId },
      canAttack: false,
      reason: 'Unit not found',
      attackerStrength: 0,
      defenderStrength: 0,
      strengthDifference: 0,
      isRanged: false,
      expectedDamageToDefender: 0,
      minDamageToDefender: 0,
      maxDamageToDefender: 0,
      expectedDamageToAttacker: 0,
      minDamageToAttacker: 0,
      maxDamageToAttacker: 0,
      defenderWillDie: false,
      attackerWillDie: false,
      odds: { attackerWinPercent: 0, drawPercent: 0, defenderWinPercent: 0, expectedDefenderHP: 0, expectedAttackerHP: 0 },
      modifiers: createEmptyModifiers(),
    };
  }

  // Check if attacker can attack
  if (attacker.owner !== state.currentPlayerId) {
    return {
      attackerId,
      target: { type: 'unit', unitId: defenderId },
      canAttack: false,
      reason: 'Not your turn',
      attackerStrength: 0,
      defenderStrength: 0,
      strengthDifference: 0,
      isRanged: false,
      expectedDamageToDefender: 0,
      minDamageToDefender: 0,
      maxDamageToDefender: 0,
      expectedDamageToAttacker: 0,
      minDamageToAttacker: 0,
      maxDamageToAttacker: 0,
      defenderWillDie: false,
      attackerWillDie: false,
      odds: { attackerWinPercent: 0, drawPercent: 0, defenderWinPercent: 0, expectedDefenderHP: 0, expectedAttackerHP: 0 },
      modifiers: createEmptyModifiers(),
    };
  }

  if (attacker.owner === defender.owner) {
    return {
      attackerId,
      target: { type: 'unit', unitId: defenderId },
      canAttack: false,
      reason: 'Cannot attack own units',
      attackerStrength: 0,
      defenderStrength: 0,
      strengthDifference: 0,
      isRanged: false,
      expectedDamageToDefender: 0,
      minDamageToDefender: 0,
      maxDamageToDefender: 0,
      expectedDamageToAttacker: 0,
      minDamageToAttacker: 0,
      maxDamageToAttacker: 0,
      defenderWillDie: false,
      attackerWillDie: false,
      odds: { attackerWinPercent: 0, drawPercent: 0, defenderWinPercent: 0, expectedDefenderHP: 0, expectedAttackerHP: 0 },
      modifiers: createEmptyModifiers(),
    };
  }

  if (attacker.movementLeft <= 0) {
    return {
      attackerId,
      target: { type: 'unit', unitId: defenderId },
      canAttack: false,
      reason: 'No movement left',
      attackerStrength: 0,
      defenderStrength: 0,
      strengthDifference: 0,
      isRanged: false,
      expectedDamageToDefender: 0,
      minDamageToDefender: 0,
      maxDamageToDefender: 0,
      expectedDamageToAttacker: 0,
      minDamageToAttacker: 0,
      maxDamageToAttacker: 0,
      defenderWillDie: false,
      attackerWillDie: false,
      odds: { attackerWinPercent: 0, drawPercent: 0, defenderWinPercent: 0, expectedDefenderHP: 0, expectedAttackerHP: 0 },
      modifiers: createEmptyModifiers(),
    };
  }

  // Check range
  const dist = distance(attacker.position, defender.position);
  const baseRange = getUnitRange(state, attacker.typeId);
  const attackerRange = baseRange + getPromotionRangeBonus(state, attacker);
  const isRanged = baseRange > 0;

  if (isRanged) {
    if (dist > attackerRange || dist === 0) {
      return {
        attackerId,
        target: { type: 'unit', unitId: defenderId },
        canAttack: false,
        reason: 'Target out of range',
        attackerStrength: 0,
        defenderStrength: 0,
        strengthDifference: 0,
        isRanged: true,
        expectedDamageToDefender: 0,
        minDamageToDefender: 0,
        maxDamageToDefender: 0,
        expectedDamageToAttacker: 0,
        minDamageToAttacker: 0,
        maxDamageToAttacker: 0,
        defenderWillDie: false,
        attackerWillDie: false,
        odds: { attackerWinPercent: 0, drawPercent: 0, defenderWinPercent: 0, expectedDefenderHP: 0, expectedAttackerHP: 0 },
        modifiers: createEmptyModifiers(),
      };
    }
  } else {
    if (dist !== 1) {
      return {
        attackerId,
        target: { type: 'unit', unitId: defenderId },
        canAttack: false,
        reason: 'Melee unit must be adjacent',
        attackerStrength: 0,
        defenderStrength: 0,
        strengthDifference: 0,
        isRanged: false,
        expectedDamageToDefender: 0,
        minDamageToDefender: 0,
        maxDamageToDefender: 0,
        expectedDamageToAttacker: 0,
        minDamageToAttacker: 0,
        maxDamageToAttacker: 0,
        defenderWillDie: false,
        attackerWillDie: false,
        odds: { attackerWinPercent: 0, drawPercent: 0, defenderWinPercent: 0, expectedDefenderHP: 0, expectedAttackerHP: 0 },
        modifiers: createEmptyModifiers(),
      };
    }
  }

  // Calculate strengths
  const attackerTile = state.map.tiles.get(coordToKey(attacker.position));
  const defenderTile = state.map.tiles.get(coordToKey(defender.position));

  const hasAdjacentAlly = checkAdjacentAlly(attacker, defender, state);
  const promotionContext = {
    isAttacking: true,
    targetWounded: defender.health < 100,
    targetFortified: defender.fortified,
    adjacentAlly: hasAdjacentAlly,
    targetIsWalls: false,
  };

  const attackerPromoBonus = getPromotionCombatBonus(state, attacker, promotionContext);
  const defenderPromoBonus = getPromotionCombatBonus(state, defender, {
    isAttacking: false,
    targetWounded: attacker.health < 100,
    adjacentAlly: false,
  });
  const defenderFortifyPromoBonus = getPromotionDefenseBonus(state, defender);

  const attackerStrength = getEffectiveCombatStrength(state, attacker, true, defender.position, attackerTile) + attackerPromoBonus;
  const defenderStrength = getEffectiveDefenseStrength(state, defender, defenderTile ?? null) + defenderPromoBonus + defenderFortifyPromoBonus;

  const strengthDiff = attackerStrength - defenderStrength;

  // Calculate damage range (random factor is 0.75 to 1.25)
  const attackerDamageMin = Math.round(30 * Math.exp(strengthDiff / 25) * 0.75);
  const attackerDamageMax = Math.round(30 * Math.exp(strengthDiff / 25) * 1.25);
  const attackerDamageExpected = Math.round((attackerDamageMin + attackerDamageMax) / 2);

  const defenderDamageMin = isRanged ? 0 : Math.round(30 * Math.exp(-strengthDiff / 25) * 0.75);
  const defenderDamageMax = isRanged ? 0 : Math.round(30 * Math.exp(-strengthDiff / 25) * 1.25);
  const defenderDamageExpected = isRanged ? 0 : Math.round((defenderDamageMin + defenderDamageMax) / 2);

  // Check if units will die
  const defenderWillDie = attackerDamageMin >= defender.health;
  const attackerWillDie = !isRanged && defenderDamageMin >= attacker.health;

  // Calculate odds using Monte Carlo approximation (deterministic via state.rng)
  const odds = calculateCombatOdds(
    attacker.health,
    defender.health,
    attackerDamageMin,
    attackerDamageMax,
    defenderDamageMin,
    defenderDamageMax,
    state.rng,
  );

  // Gather modifiers for display
  const flankingBonus = calculateFlankingBonus(attacker, defender.position, state);
  const terrainDefenseBonus = defenderTile ? getTerrainDefenseBonus(state, defenderTile) : 0;
  const riverPenalty = Boolean(attackerTile && attackerTile.river.length > 0);
  const firstStrikeBonus = attacker.health === 100;
  const warSupportPenalty = calculateWarSupportPenalty(state, attacker.owner);

  const modifiers: CombatModifiers = {
    attackerHealth: attacker.health,
    defenderHealth: defender.health,
    attackerFortified: attacker.fortified,
    defenderFortified: defender.fortified,
    flankingBonus,
    terrainDefenseBonus: Math.round(terrainDefenseBonus * 100),
    riverPenalty,
    firstStrikeBonus,
    warSupportPenalty,
    adjacentAlly: hasAdjacentAlly,
    targetWounded: defender.health < 100,
  };

  return {
    attackerId,
    target: { type: 'unit', unitId: defenderId },
    canAttack: true,
    attackerStrength,
    defenderStrength,
    strengthDifference: strengthDiff,
    isRanged,
    expectedDamageToDefender: attackerDamageExpected,
    minDamageToDefender: attackerDamageMin,
    maxDamageToDefender: attackerDamageMax,
    expectedDamageToAttacker: defenderDamageExpected,
    minDamageToAttacker: defenderDamageMin,
    maxDamageToAttacker: defenderDamageMax,
    defenderWillDie,
    attackerWillDie,
    odds,
    modifiers,
  };
}

/**
 * Calculate combat odds using discrete probability distribution.
 * Samples the damage range to estimate win/draw/loss percentages.
 * Uses a seeded RNG snapshot so results are deterministic and replayable.
 */
function calculateCombatOdds(
  attackerHP: number,
  defenderHP: number,
  attackerDmgMin: number,
  attackerDmgMax: number,
  defenderDmgMin: number,
  defenderDmgMax: number,
  rng: RngState,
): CombatOdds {
  const SAMPLES = 100;
  let attackerWins = 0;
  let defenderWins = 0;
  let draws = 0;
  let totalDefenderHP = 0;
  let totalAttackerHP = 0;
  let currentRng = rng;

  for (let i = 0; i < SAMPLES; i++) {
    // Deterministic damage within range using seeded RNG
    const { value: r1, rng: rng2 } = nextRandom(currentRng);
    const { value: r2, rng: rng3 } = nextRandom(rng2);
    currentRng = rng3;
    const attackerDmg = attackerDmgMin + r1 * (attackerDmgMax - attackerDmgMin);
    const defenderDmg = defenderDmgMin + r2 * (defenderDmgMax - defenderDmgMin);

    const newDefenderHP = Math.max(0, defenderHP - attackerDmg);
    const newAttackerHP = Math.max(0, attackerHP - defenderDmg);

    totalDefenderHP += newDefenderHP;
    totalAttackerHP += newAttackerHP;

    if (newDefenderHP <= 0 && newAttackerHP > 0) {
      attackerWins++;
    } else if (newAttackerHP <= 0 && newDefenderHP > 0) {
      defenderWins++;
    } else if (newDefenderHP <= 0 && newAttackerHP <= 0) {
      // Both die - count as draw
      draws++;
    } else {
      // Both survive
      draws++;
    }
  }

  return {
    attackerWinPercent: Math.round((attackerWins / SAMPLES) * 100),
    drawPercent: Math.round((draws / SAMPLES) * 100),
    defenderWinPercent: Math.round((defenderWins / SAMPLES) * 100),
    expectedDefenderHP: Math.round(totalDefenderHP / SAMPLES),
    expectedAttackerHP: Math.round(totalAttackerHP / SAMPLES),
  };
}

/**
 * Get all units that can be attacked by the selected unit.
 */
export function getAttackableUnits(
  state: GameState,
  attackerId: string,
): ReadonlyArray<{ unitId: string; position: HexCoord }> {
  const attacker = state.units.get(attackerId);
  if (!attacker || attacker.owner !== state.currentPlayerId || attacker.movementLeft <= 0) {
    return [];
  }

  const baseRange = getUnitRange(state, attacker.typeId);
  const attackerRange = baseRange + getPromotionRangeBonus(state, attacker);
  const isRanged = baseRange > 0;

  const attackable: { unitId: string; position: HexCoord }[] = [];

  for (const [id, defender] of state.units) {
    if (defender.owner === attacker.owner) continue;

    const dist = distance(attacker.position, defender.position);

    if (isRanged) {
      if (dist > 0 && dist <= attackerRange) {
        attackable.push({ unitId: id, position: defender.position });
      }
    } else {
      if (dist === 1) {
        attackable.push({ unitId: id, position: defender.position });
      }
    }
  }

  return attackable;
}

/**
 * Calculate combat preview for attacking a city.
 * Similar to calculateCombatPreview but for city targets.
 */
export function calculateCityCombatPreview(
  state: GameState,
  attackerId: string,
  cityId: string,
): CombatPreview {
  const attacker = state.units.get(attackerId);
  const city = state.cities.get(cityId);

  if (!attacker || !city) {
    return {
      attackerId,
      target: { type: 'city', cityId },
      canAttack: false,
      reason: 'Unit or city not found',
      attackerStrength: 0,
      defenderStrength: 0,
      strengthDifference: 0,
      isRanged: false,
      expectedDamageToDefender: 0,
      minDamageToDefender: 0,
      maxDamageToDefender: 0,
      expectedDamageToAttacker: 0,
      minDamageToAttacker: 0,
      maxDamageToAttacker: 0,
      defenderWillDie: false,
      attackerWillDie: false,
      odds: { attackerWinPercent: 0, drawPercent: 0, defenderWinPercent: 0, expectedDefenderHP: 0, expectedAttackerHP: 0 },
      modifiers: createEmptyModifiers(),
    };
  }

  if (attacker.owner !== state.currentPlayerId) {
    return {
      attackerId,
      target: { type: 'city', cityId },
      canAttack: false,
      reason: 'Not your turn',
      attackerStrength: 0,
      defenderStrength: 0,
      strengthDifference: 0,
      isRanged: false,
      expectedDamageToDefender: 0,
      minDamageToDefender: 0,
      maxDamageToDefender: 0,
      expectedDamageToAttacker: 0,
      minDamageToAttacker: 0,
      maxDamageToAttacker: 0,
      defenderWillDie: false,
      attackerWillDie: false,
      odds: { attackerWinPercent: 0, drawPercent: 0, defenderWinPercent: 0, expectedDefenderHP: 0, expectedAttackerHP: 0 },
      modifiers: createEmptyModifiers(),
    };
  }

  if (attacker.owner === city.owner) {
    return {
      attackerId,
      target: { type: 'city', cityId },
      canAttack: false,
      reason: 'Cannot attack own city',
      attackerStrength: 0,
      defenderStrength: 0,
      strengthDifference: 0,
      isRanged: false,
      expectedDamageToDefender: 0,
      minDamageToDefender: 0,
      maxDamageToDefender: 0,
      expectedDamageToAttacker: 0,
      minDamageToAttacker: 0,
      maxDamageToAttacker: 0,
      defenderWillDie: false,
      attackerWillDie: false,
      odds: { attackerWinPercent: 0, drawPercent: 0, defenderWinPercent: 0, expectedDefenderHP: 0, expectedAttackerHP: 0 },
      modifiers: createEmptyModifiers(),
    };
  }

  if (attacker.movementLeft <= 0) {
    return {
      attackerId,
      target: { type: 'city', cityId },
      canAttack: false,
      reason: 'No movement left',
      attackerStrength: 0,
      defenderStrength: 0,
      strengthDifference: 0,
      isRanged: false,
      expectedDamageToDefender: 0,
      minDamageToDefender: 0,
      maxDamageToDefender: 0,
      expectedDamageToAttacker: 0,
      minDamageToAttacker: 0,
      maxDamageToAttacker: 0,
      defenderWillDie: false,
      attackerWillDie: false,
      odds: { attackerWinPercent: 0, drawPercent: 0, defenderWinPercent: 0, expectedDefenderHP: 0, expectedAttackerHP: 0 },
      modifiers: createEmptyModifiers(),
    };
  }

  // Check range
  const dist = distance(attacker.position, city.position);
  const baseRange = getUnitRange(state, attacker.typeId);
  const attackerRange = baseRange + getPromotionRangeBonus(state, attacker);
  const isRanged = baseRange > 0;

  if (isRanged) {
    if (dist > attackerRange || dist === 0) {
      return {
        attackerId,
        target: { type: 'city', cityId },
        canAttack: false,
        reason: 'Target out of range',
        attackerStrength: 0,
        defenderStrength: 0,
        strengthDifference: 0,
        isRanged: true,
        expectedDamageToDefender: 0,
        minDamageToDefender: 0,
        maxDamageToDefender: 0,
        expectedDamageToAttacker: 0,
        minDamageToAttacker: 0,
        maxDamageToAttacker: 0,
        defenderWillDie: false,
        attackerWillDie: false,
        odds: { attackerWinPercent: 0, drawPercent: 0, defenderWinPercent: 0, expectedDefenderHP: 0, expectedAttackerHP: 0 },
        modifiers: createEmptyModifiers(),
      };
    }
  } else {
    if (dist !== 1) {
      return {
        attackerId,
        target: { type: 'city', cityId },
        canAttack: false,
        reason: 'Melee unit must be adjacent',
        attackerStrength: 0,
        defenderStrength: 0,
        strengthDifference: 0,
        isRanged: false,
        expectedDamageToDefender: 0,
        minDamageToDefender: 0,
        maxDamageToDefender: 0,
        expectedDamageToAttacker: 0,
        minDamageToAttacker: 0,
        maxDamageToAttacker: 0,
        defenderWillDie: false,
        attackerWillDie: false,
        odds: { attackerWinPercent: 0, drawPercent: 0, defenderWinPercent: 0, expectedDefenderHP: 0, expectedAttackerHP: 0 },
        modifiers: createEmptyModifiers(),
      };
    }
  }

  // Calculate strengths
  const attackerTile = state.map.tiles.get(coordToKey(attacker.position));
  const cityDefense = getCityDefenseStrength(city);

  const attackerPromoBonus = getPromotionCombatBonus(state, attacker, {
    isAttacking: true,
    targetWounded: city.defenseHP < (city.buildings.includes('walls') ? 200 : 100),
    targetFortified: false,
    adjacentAlly: false,
    targetIsWalls: city.buildings.includes('walls'),
  });

  const attackerStrength = getEffectiveCombatStrength(state, attacker, true, undefined, attackerTile) + attackerPromoBonus;

  const strengthDiff = attackerStrength - cityDefense;

  // Calculate damage range
  const attackerDamageMin = Math.round(30 * Math.exp(strengthDiff / 25) * 0.75);
  const attackerDamageMax = Math.round(30 * Math.exp(strengthDiff / 25) * 1.25);
  const attackerDamageExpected = Math.round((attackerDamageMin + attackerDamageMax) / 2);

  // City retaliation (ranged, range 2, only hits melee attackers)
  const defenderDamageMin = isRanged ? 0 : Math.round(30 * Math.exp(-strengthDiff / 25) * 0.75);
  const defenderDamageMax = isRanged ? 0 : Math.round(30 * Math.exp(-strengthDiff / 25) * 1.25);
  const defenderDamageExpected = isRanged ? 0 : Math.round((defenderDamageMin + defenderDamageMax) / 2);

  const maxCityHP = city.buildings.includes('walls') ? 200 : 100;
  const defenderWillDie = !isRanged && attackerDamageMin >= city.defenseHP; // Only melee can capture
  const attackerWillDie = !isRanged && defenderDamageMin >= attacker.health;

  // For cities, "win" means capturing the city (melee only)
  const attackerWinPercent = isRanged ? 0 : Math.min(100, Math.round((attackerDamageExpected / city.defenseHP) * 100));

  const odds: CombatOdds = {
    attackerWinPercent,
    drawPercent: isRanged ? 100 : 100 - attackerWinPercent,
    defenderWinPercent: 0,
    expectedDefenderHP: Math.max(0, city.defenseHP - attackerDamageExpected),
    expectedAttackerHP: Math.max(0, attacker.health - defenderDamageExpected),
  };

  const riverPenalty = Boolean(attackerTile && attackerTile.river.length > 0);
  const firstStrikeBonus = attacker.health === 100;
  const warSupportPenalty = calculateWarSupportPenalty(state, attacker.owner);

  const modifiers: CombatModifiers = {
    attackerHealth: attacker.health,
    defenderHealth: city.defenseHP,
    attackerFortified: attacker.fortified,
    defenderFortified: false,
    flankingBonus: 0,
    terrainDefenseBonus: 0,
    riverPenalty,
    firstStrikeBonus,
    warSupportPenalty,
    adjacentAlly: false,
    targetWounded: city.defenseHP < maxCityHP,
  };

  return {
    attackerId,
    target: { type: 'city', cityId },
    canAttack: true,
    attackerStrength,
    defenderStrength: cityDefense,
    strengthDifference: strengthDiff,
    isRanged,
    expectedDamageToDefender: attackerDamageExpected,
    minDamageToDefender: attackerDamageMin,
    maxDamageToDefender: attackerDamageMax,
    expectedDamageToAttacker: defenderDamageExpected,
    minDamageToAttacker: defenderDamageMin,
    maxDamageToAttacker: defenderDamageMax,
    defenderWillDie,
    attackerWillDie,
    odds,
    modifiers,
  };
}

/**
 * Get all cities that can be attacked by the selected unit.
 */
export function getAttackableCities(
  state: GameState,
  attackerId: string,
): ReadonlyArray<{ cityId: string; position: HexCoord }> {
  const attacker = state.units.get(attackerId);
  if (!attacker || attacker.owner !== state.currentPlayerId || attacker.movementLeft <= 0) {
    return [];
  }

  const baseRange = getUnitRange(state, attacker.typeId);
  const attackerRange = baseRange + getPromotionRangeBonus(state, attacker);
  const isRanged = baseRange > 0;

  const attackable: { cityId: string; position: HexCoord }[] = [];

  for (const [id, city] of state.cities) {
    if (city.owner === attacker.owner) continue;

    const dist = distance(attacker.position, city.position);

    if (isRanged) {
      if (dist > 0 && dist <= attackerRange) {
        attackable.push({ cityId: id, position: city.position });
      }
    } else {
      if (dist === 1) {
        attackable.push({ cityId: id, position: city.position });
      }
    }
  }

  return attackable;
}

// ── Helper functions (copied from combatSystem for preview) ──

/**
 * Get city defense strength.
 */
function getCityDefenseStrength(city: CityState): number {
  const base = 10;
  const wallsBonus = city.buildings.includes('walls') ? 15 : 0;
  return base + wallsBonus;
}

/**
 * Get effective combat strength for preview — uses computeEffectiveCS to match
 * combatSystem's resolution formula exactly (VII: multiplicative HP scaling).
 */
function getEffectiveCombatStrength(
  state: GameState,
  unit: UnitState,
  isAttacking: boolean,
  defenderPosition?: HexCoord,
  attackerTile?: HexTile | null,
): number {
  const base = getBaseCombatStrength(state, unit.typeId, isAttacking);
  // VII: health scales CS multiplicatively — same formula as combatSystem
  const effectiveBase = computeEffectiveCS(base, unit.health);
  const flankingBonus = isAttacking && defenderPosition
    ? calculateFlankingBonus(unit, defenderPosition, state)
    : 0;
  const firstStrikeBonus = isAttacking && unit.health === 100 ? 5 : 0;
  // B1: River penalty — flat -2 CS (matches combatSystem, not old 15% of base)
  const riverPenalty = isAttacking && attackerTile && attackerTile.river.length > 0
    ? 2
    : 0;
  const warSupportPenalty = calculateWarSupportPenalty(state, unit.owner);

  return effectiveBase + flankingBonus + firstStrikeBonus - riverPenalty - warSupportPenalty;
}

/**
 * Get effective defense strength for preview — uses computeEffectiveCS to match
 * combatSystem's resolution formula exactly (VII: multiplicative HP scaling).
 */
function getEffectiveDefenseStrength(state: GameState, unit: UnitState, tile: HexTile | null): number {
  const base = getBaseCombatStrength(state, unit.typeId, false);
  // VII: health scales CS multiplicatively — same formula as combatSystem
  let strength = computeEffectiveCS(base, unit.health);

  if (tile) {
    const terrainBonus = getTerrainDefenseBonus(state, tile);
    strength *= (1 + terrainBonus);
  }

  if (unit.fortified) {
    strength += 5;
  }

  return strength;
}

function getBaseCombatStrength(state: GameState, typeId: string, isRangedAttack: boolean): number {
  const unitDef = state.config.units.get(typeId);
  const combat = unitDef?.combat ?? 15;
  const rangedCombat = unitDef?.rangedCombat ?? 0;
  if (isRangedAttack && rangedCombat > 0) return rangedCombat;
  return combat;
}

function getUnitRange(state: GameState, typeId: string): number {
  return state.config.units.get(typeId)?.range ?? 0;
}

function getTerrainDefenseBonus(state: GameState, tile: HexTile): number {
  let percent = 0;
  let flat = 0;
  const terrainDef = state.config.terrains.get(tile.terrain);
  percent += terrainDef?.defenseBonus ?? 0;

  if (tile.feature) {
    const featureDef = state.config.features.get(tile.feature);
    percent += featureDef?.defenseBonusModifier ?? 0;
    // F-08: include flat defense bonus (rulebook §6.4 rough/vegetated terrain)
    flat += featureDef?.flatDefenseBonus ?? 0;
  }

  // Return combined effect as a single display value:
  // percent (fractional, displayed as %) + flat (CS, displayed as CS)
  // The caller multiplies by 100 for percent display, so we convert flat
  // to the same scale by treating each CS as 1.0 (= 100 when × 100).
  return percent + flat;
}

function calculateFlankingBonus(attacker: UnitState, defenderPosition: HexCoord, state: GameState): number {
  const defNeighbors = neighbors(defenderPosition);
  let flankingCount = 0;
  for (const [, u] of state.units) {
    if (u.id === attacker.id) continue;
    if (u.owner !== attacker.owner) continue;
    const isAdjacent = defNeighbors.some(n => n.q === u.position.q && n.r === u.position.r);
    if (isAdjacent) flankingCount++;
  }
  return Math.min(flankingCount * 2, 6);
}

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

function calculateWarSupportPenalty(state: GameState, playerId: string): number {
  let maxPenalty = 0;
  for (const [key, rel] of state.diplomacy.relations) {
    if (rel.status !== 'war') continue;
    if (!key.includes(playerId)) continue;

    const [p1] = key.split(':');
    const isAttacker = p1 === playerId;

    const negativeSupport = isAttacker
      ? Math.max(0, -rel.warSupport)
      : Math.max(0, rel.warSupport);

    const penalty = Math.min(10, negativeSupport);
    if (penalty > maxPenalty) maxPenalty = penalty;
  }
  return maxPenalty;
}

function createEmptyModifiers(): CombatModifiers {
  return {
    attackerHealth: 100,
    defenderHealth: 100,
    attackerFortified: false,
    defenderFortified: false,
    flankingBonus: 0,
    terrainDefenseBonus: 0,
    riverPenalty: false,
    firstStrikeBonus: false,
    warSupportPenalty: 0,
    adjacentAlly: false,
    targetWounded: false,
  };
}
