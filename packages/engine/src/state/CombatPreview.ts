import type { GameState, UnitState, HexTile, CityState, RngState } from '../types/GameState';
import type { HexCoord } from '../types/HexCoord';
import { coordToKey, neighbors, distance } from '../hex/HexMath';
import { getPromotionCombatBonus, getPromotionDefenseBonus, getPromotionRangeBonus } from './PromotionUtils';
import { nextRandom } from './SeededRng';
import {
  calculateBattlefrontFlankingBonus,
  calculateFirstStrikeCombatBonus,
  COMBAT_DAMAGE_RANDOM_MAX,
  COMBAT_DAMAGE_RANDOM_MIN,
  computeCombatDamage,
  computeEffectiveCS,
  hexDirectionIndex,
} from './CombatAnalytics';
import { getCombatBonus, getWarSupportBonus } from './EffectUtils';
import { getCommanderAuraCombatBonus, getCommanderAuraHealAfterAttackAmount } from './CommanderAura';
import {
  cityUsesDistrictSiegeModel,
  getCityCenterDistrictKey,
  getEffectiveDistrictHPs,
  getDistrictHPs,
  hasStandingCityCenterDistrict,
  hasStandingOuterDistricts,
} from './DistrictSiege';

/**
 * Target type for combat preview.
 */
export type CombatTarget =
  | { readonly type: 'unit'; readonly unitId: string }
  | { readonly type: 'city'; readonly cityId: string }
  | { readonly type: 'district'; readonly cityId: string; readonly districtTile: string };

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

  const attackerStrength = getEffectiveCombatStrength(state, attacker, true, defender.position, attackerTile, defender) + attackerPromoBonus;
  const defenderStrength = getEffectiveDefenseStrength(state, defender, defenderTile ?? null) + defenderPromoBonus + defenderFortifyPromoBonus;

  const strengthDiff = attackerStrength - defenderStrength;

  // Calculate damage range (random factor is 0.70 to 1.30)
  const attackerDamageMin = computeCombatDamage(strengthDiff, COMBAT_DAMAGE_RANDOM_MIN);
  const attackerDamageMax = computeCombatDamage(strengthDiff, COMBAT_DAMAGE_RANDOM_MAX);
  const attackerDamageExpected = Math.round((attackerDamageMin + attackerDamageMax) / 2);

  const defenderDamageMin = isRanged ? 0 : computeCombatDamage(-strengthDiff, COMBAT_DAMAGE_RANDOM_MIN);
  const defenderDamageMax = isRanged ? 0 : computeCombatDamage(-strengthDiff, COMBAT_DAMAGE_RANDOM_MAX);
  const defenderDamageExpected = isRanged ? 0 : Math.round((defenderDamageMin + defenderDamageMax) / 2);
  const afterAttackHeal = getCommanderAuraHealAfterAttackAmount(state, attacker);

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
    afterAttackHeal,
    state.rng,
  );

  // Gather modifiers for display
  const flankingBonus = calculateFlankingBonus(attacker, defender.position, state);
  const terrainBonusForDisplay = defenderTile ? getTerrainDefenseBonus(state, defenderTile) : { percent: 0, flat: 0 };
  // River penalty: only applies when crossing the specific edge facing the defender
  const riverPenalty = Boolean(attackerTile && isRiverEdgeBetweenPreview(attackerTile, attacker.position, defender.position));
  const firstStrikeBonus = calculateFirstStrikeCombatBonus(state, attacker, true) > 0;
  const warSupportPenalty = calculateWarSupportPenalty(state, attacker.owner);

  const modifiers: CombatModifiers = {
    attackerHealth: attacker.health,
    defenderHealth: defender.health,
    attackerFortified: attacker.fortified,
    defenderFortified: defender.fortified,
    flankingBonus,
    terrainDefenseBonus: Math.round(terrainBonusForDisplay.percent * 100) + terrainBonusForDisplay.flat,
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
  afterAttackHeal: number,
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
    const damagedAttackerHP = Math.max(0, attackerHP - defenderDmg);
    const newAttackerHP = damagedAttackerHP > 0
      ? applyAfterAttackHealing(damagedAttackerHP, afterAttackHeal)
      : 0;

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

  if (hasStandingOuterDistricts(city)) {
    return {
      attackerId,
      target: { type: 'city', cityId },
      canAttack: false,
      reason: 'Must destroy all outer districts before attacking the city center',
      attackerStrength: 0,
      defenderStrength: 0,
      strengthDifference: 0,
      isRanged,
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

  if (hasStandingCityCenterDistrict(state, city)) {
    return {
      attackerId,
      target: { type: 'city', cityId },
      canAttack: false,
      reason: 'Must destroy the city center district before attacking the city',
      attackerStrength: 0,
      defenderStrength: 0,
      strengthDifference: 0,
      isRanged,
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
  const attackerDamageMin = computeCombatDamage(strengthDiff, COMBAT_DAMAGE_RANDOM_MIN);
  const attackerDamageMax = computeCombatDamage(strengthDiff, COMBAT_DAMAGE_RANDOM_MAX);
  const attackerDamageExpected = Math.round((attackerDamageMin + attackerDamageMax) / 2);

  // City retaliation (ranged, range 2, only hits melee attackers)
  const defenderDamageMin = isRanged ? 0 : computeCombatDamage(-strengthDiff, COMBAT_DAMAGE_RANDOM_MIN);
  const defenderDamageMax = isRanged ? 0 : computeCombatDamage(-strengthDiff, COMBAT_DAMAGE_RANDOM_MAX);
  const defenderDamageExpected = isRanged ? 0 : Math.round((defenderDamageMin + defenderDamageMax) / 2);
  const afterAttackHeal = getCommanderAuraHealAfterAttackAmount(state, attacker);

  const maxCityHP = city.buildings.includes('walls') ? 200 : 100;
  const defenderWillDie = !isRanged && attackerDamageMin >= city.defenseHP; // Only melee can capture
  const attackerWillDie = !isRanged && defenderDamageMin >= attacker.health;

  // For cities, "win" means capturing the city (melee only)
  const attackerWinPercent = isRanged ? 0 : Math.min(100, Math.round((attackerDamageExpected / city.defenseHP) * 100));
  const expectedPostCombatAttackerHP = Math.max(0, attacker.health - defenderDamageExpected);

  const odds: CombatOdds = {
    attackerWinPercent,
    drawPercent: isRanged ? 100 : 100 - attackerWinPercent,
    defenderWinPercent: 0,
    expectedDefenderHP: Math.max(0, city.defenseHP - attackerDamageExpected),
    expectedAttackerHP: expectedPostCombatAttackerHP > 0
      ? applyAfterAttackHealing(expectedPostCombatAttackerHP, afterAttackHeal)
      : 0,
  };

  const riverPenalty = Boolean(attackerTile && attackerTile.river.length > 0);
  const firstStrikeBonus = calculateFirstStrikeCombatBonus(state, attacker, true) > 0;
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
    if (hasStandingOuterDistricts(city)) continue;
    if (hasStandingCityCenterDistrict(state, city)) continue;

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

export function getAttackableDistricts(
  state: GameState,
  attackerId: string,
): ReadonlyArray<{ cityId: string; districtTile: string; position: HexCoord }> {
  const attacker = state.units.get(attackerId);
  if (!attacker || attacker.owner !== state.currentPlayerId || attacker.movementLeft <= 0) {
    return [];
  }

  const baseRange = getUnitRange(state, attacker.typeId);
  const attackerRange = baseRange + getPromotionRangeBonus(state, attacker);
  const isRanged = baseRange > 0;
  const attackable: Array<{ cityId: string; districtTile: string; position: HexCoord }> = [];

  for (const [cityId, city] of state.cities) {
    if (city.owner === attacker.owner) continue;

    if (!cityUsesDistrictSiegeModel(state, city)) continue;

    const districtHPs = getEffectiveDistrictHPs(state, city);
    const cityCenter = getCityCenterDistrictKey(city);
    const hasStandingNonCenter = [...districtHPs.entries()].some(
      ([districtTile, hp]) => districtTile !== cityCenter && hp > 0,
    );

    for (const [districtTile, hp] of districtHPs) {
      if (hp <= 0) continue;
      if (districtTile === cityCenter && hasStandingNonCenter) continue;
      const [q, r] = districtTile.split(',').map(Number);
      const position = { q, r };
      const dist = distance(attacker.position, position);
      if (isRanged) {
        if (dist > 0 && dist <= attackerRange) attackable.push({ cityId, districtTile, position });
      } else if (dist === 1) {
        attackable.push({ cityId, districtTile, position });
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
 * Get effective combat strength for preview — mirrors combatSystem's
 * getEffectiveCombatStrength exactly (VII: additive wounded penalty,
 * plus all active bonuses: effects, resources, commander aura, support).
 */
function getEffectiveCombatStrength(
  state: GameState,
  unit: UnitState,
  isAttacking: boolean,
  defenderPosition?: HexCoord,
  attackerTile?: HexTile | null,
  defenderUnit?: UnitState,
): number {
  const base = getBaseCombatStrength(state, unit.typeId, isAttacking);
  // VII: wounded penalty is additive — same formula as combatSystem.
  const effectiveBase = computeEffectiveCS(base, unit.health);
  const firstStrikeBonus = calculateFirstStrikeCombatBonus(state, unit, isAttacking);
  const flankingBonus = isAttacking && defenderPosition
    ? calculateFlankingBonus(unit, defenderPosition, state)
    : 0;
  // B1: River penalty — multiplicative -25% when crossing a river edge to attack
  const crossingRiver = isAttacking && attackerTile && defenderPosition
    ? isRiverEdgeBetweenPreview(attackerTile, unit.position, defenderPosition)
    : false;
  const warSupportPenalty = calculateWarSupportPenalty(state, unit.owner);
  // Civ/leader/legacy combat bonuses (MODIFY_COMBAT effects) — mirrors combatSystem
  const unitDef = state.config.units.get(unit.typeId);
  const category = unitDef?.category ?? 'melee';
  const effectBonus = getCombatBonus(state, unit.owner, category);
  // Empire resource combat strength modifiers — mirrors combatSystem
  const resourceBonus = calculateResourceCombatBonusPreview(state, unit.owner, category, defenderUnit);
  // Commander aura: +3 CS per friendly commander within 2 hexes — mirrors combatSystem
  const commanderAuraBonus = getCommanderAuraCombatBonus(state, unit, { isAttacking });
  // F-07: Adjacent friendly support bonus — +2 CS per adjacent friendly unit (attack only here).
  const supportBonus = isAttacking ? calculateSupportBonus(unit, state) : 0;

  const baseTotal = effectiveBase + flankingBonus + firstStrikeBonus + effectBonus + resourceBonus + commanderAuraBonus + supportBonus - warSupportPenalty;
  // Apply river-crossing penalty as multiplicative -25% (same as combatSystem)
  return crossingRiver ? Math.floor(baseTotal * 0.75) : baseTotal;
}

/**
 * Get effective defense strength for preview — uses computeEffectiveCS to match
 * combatSystem's resolution formula exactly (VII: additive wounded penalty).
 */
function getEffectiveDefenseStrength(state: GameState, unit: UnitState, tile: HexTile | null): number {
  const base = getBaseCombatStrength(state, unit.typeId, false);
  // VII: wounded penalty is additive — same formula as combatSystem.
  let strength = computeEffectiveCS(base, unit.health);

  // Terrain defense bonus — multiplicative component on base strength
  if (tile) {
    const { percent, flat } = getTerrainDefenseBonus(state, tile);
    strength *= (1 + percent);
    strength += flat;
  }

  // F-07: Adjacent friendly support bonus — +2 CS per adjacent friendly unit.
  const supportBonus = calculateSupportBonus(unit, state);
  strength += supportBonus;

  // B6: Fortification bonus is flat +5 CS additive — mirrors combatSystem
  if (unit.fortified) {
    strength += 5;
  }

  // Commander aura: +3 CS per friendly commander within 2 hexes — mirrors combatSystem
  const commanderAuraBonus = getCommanderAuraCombatBonus(state, unit, { isAttacking: false });
  strength += commanderAuraBonus;

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

function applyAfterAttackHealing(postCombatHealth: number, amount: number): number {
  return amount > 0 ? Math.min(100, postCombatHealth + amount) : postCombatHealth;
}

function getTerrainDefenseBonus(state: GameState, tile: HexTile): { percent: number; flat: number } {
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

  return { percent, flat };
}

function calculateFlankingBonus(attacker: UnitState, defenderPosition: HexCoord, state: GameState): number {
  return calculateBattlefrontFlankingBonus(state, attacker, defenderPosition);
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

    const penalty = Math.max(0, Math.min(10, negativeSupport) - getWarSupportBonus(state, playerId));
    if (penalty > maxPenalty) maxPenalty = penalty;
  }
  return maxPenalty;
}

/**
 * Empire resource combat strength bonus — mirrors combatSystem's
 * calculateResourceCombatBonus. Reads player.ownedResources and sums
 * bonusTable[currentAge].combatMod entries matching the unit's category
 * (and optionally the defender's category via versusCategory).
 */
function calculateResourceCombatBonusPreview(
  state: GameState,
  playerId: string,
  unitCategory: string,
  defenderUnit?: UnitState,
): number {
  const player = state.players.get(playerId);
  if (!player) return 0;
  const owned = (player as typeof player & { readonly ownedResources?: ReadonlyArray<string> }).ownedResources;
  if (!owned || owned.length === 0) return 0;
  const currentAge = state.age.currentAge;
  let bonus = 0;
  for (const resId of owned) {
    const resDef = state.config.resources.get(resId);
    const row = resDef?.bonusTable?.[currentAge];
    if (!row?.combatMod) continue;
    const mod = row.combatMod;
    if (mod.unitCategory !== unitCategory) continue;
    if (mod.versusCategory !== undefined && mod.versusCategory !== null) {
      if (!defenderUnit) continue;
      const defDef = state.config.units.get(defenderUnit.typeId);
      const defCategory = defDef?.category ?? 'melee';
      if (defCategory !== mod.versusCategory) continue;
    }
    bonus += mod.value;
  }
  return bonus;
}

/**
 * F-07 support bonus — mirrors combatSystem's calculateSupportBonus.
 * Every adjacent friendly unit contributes +2 CS.
 */
function calculateSupportBonus(attacker: UnitState, state: GameState): number {
  const adjHexes = neighbors(attacker.position);
  let supportCount = 0;
  for (const [, u] of state.units) {
    if (u.id === attacker.id) continue;
    if (u.health <= 0) continue;
    if (u.owner !== attacker.owner) continue;
    const isAdj = adjHexes.some(n => n.q === u.position.q && n.r === u.position.r);
    if (isAdj) supportCount++;
  }
  return supportCount * 2;
}

/**
 * River-crossing penalty check — mirrors combatSystem's isRiverEdgeBetween.
 * Returns true if attacker's tile has a river on the edge facing the defender.
 * HEX_DIRECTIONS: 0=E, 1=NE, 2=NW, 3=W, 4=SW, 5=SE.
 */
function isRiverEdgeBetweenPreview(
  attackerTile: HexTile,
  attackerPos: HexCoord,
  defenderPos: HexCoord,
): boolean {
  const edgeIndex = hexDirectionIndex(attackerPos, defenderPos);
  if (edgeIndex === -1) return false;
  return attackerTile.river.includes(edgeIndex);
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
