import type { GameState, GameAction, UnitState, HexTile, CityState } from '../types/GameState';
import type { HexCoord } from '../types/HexCoord';
import { coordToKey, neighbors, distance } from '../hex/HexMath';
import { getPromotionCombatBonus, getPromotionDefenseBonus, getPromotionRangeBonus } from '../state/PromotionUtils';
import { nextRandom } from '../state/SeededRng';
import { getCombatBonus } from '../state/EffectUtils';

/**
 * CombatSystem handles unit attacks (both unit-vs-unit and unit-vs-city).
 * Combat formula (Civ-style):
 * - Damage = 30 * e^(strengthDiff / 25)
 * - strengthDiff = attacker effective strength - defender effective strength
 * - Modifiers: terrain defense, fortification, flanking, health penalty
 */
export function combatSystem(state: GameState, action: GameAction): GameState {
  if (action.type === 'ATTACK_CITY') return handleAttackCity(state, action);
  if (action.type !== 'ATTACK_UNIT') return state;

  const attacker = state.units.get(action.attackerId);
  const defender = state.units.get(action.targetId);
  if (!attacker || !defender) return createInvalidResult(state, 'Unit not found', 'combat');
  if (attacker.owner !== state.currentPlayerId) return createInvalidResult(state, 'Not your unit or turn', 'combat');
  if (attacker.owner === defender.owner) return createInvalidResult(state, 'Friendly fire - cannot attack own units', 'combat');
  if (attacker.movementLeft <= 0) return createInvalidResult(state, 'Unit has already attacked this turn', 'combat');

  // Check range (includes promotion range bonus)
  const dist = distance(attacker.position, defender.position);
  const baseRange = getUnitRange(state, attacker.typeId);
  const attackerRange = baseRange + getPromotionRangeBonus(state, attacker);

  if (baseRange === 0) {
    // Melee: must be adjacent (range bonuses don't apply to melee)
    if (dist !== 1) return createInvalidResult(state, 'Target out of melee range', 'combat');
  } else {
    // Ranged: must be within range
    if (dist > attackerRange || dist === 0) return createInvalidResult(state, 'Target out of attack range', 'combat');
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
  const attackerTile = state.map.tiles.get(coordToKey(attacker.position));
  const defenderTile = state.map.tiles.get(coordToKey(defender.position));
  const attackerPromoBonus = getPromotionCombatBonus(state, attacker, promotionContext);
  const defenderPromoBonus = getPromotionCombatBonus(state, defender, {
    isAttacking: false,
    targetWounded: attacker.health < 100,
    adjacentAlly: false,
  });
  const defenderFortifyPromoBonus = getPromotionDefenseBonus(state, defender);
  const attackerStrength = getEffectiveCombatStrength(state, attacker, true, defender.position, attackerTile) + attackerPromoBonus;
  const defenderStrength = getEffectiveDefenseStrength(state, defender, defenderTile ?? null) + defenderPromoBonus + defenderFortifyPromoBonus;

  // Calculate damage with seeded randomness
  const strengthDiff = attackerStrength - defenderStrength;

  // First random: modifier for attacker damage (0.75 to 1.25)
  const { value: randomFactor1, rng: rng1 } = nextRandom(state.rng);
  const modifier1 = 0.75 + randomFactor1 * 0.5;
  const attackerDamage = Math.round(30 * Math.exp(strengthDiff / 25) * modifier1); // damage to defender

  // Second random: modifier for defender damage (0.75 to 1.25)
  const { value: randomFactor2, rng: rng2 } = nextRandom(rng1);
  const modifier2 = 0.75 + randomFactor2 * 0.5;
  const defenderDamage = attackerRange > 0
    ? 0 // ranged units don't take damage when attacking
    : Math.round(30 * Math.exp(-strengthDiff / 25) * modifier2); // damage to attacker (melee only)

  let currentRng = rng2;

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

  // Track kills for legacy milestones
  const updatedPlayers = new Map(state.players);

  // Update defender
  if (newDefenderHealth <= 0) {
    updatedUnits.delete(defender.id);
    logEntries.push({
      turn: state.turn,
      playerId: state.currentPlayerId,
      message: `${attacker.typeId} destroyed ${defender.typeId}!`,
      type: 'combat',
    });

    // Increment totalKills for the attacker's owner
    if (newAttackerHealth > 0) {
      const attackerPlayer = state.players.get(attacker.owner);
      if (attackerPlayer) {
        updatedPlayers.set(attackerPlayer.id, {
          ...attackerPlayer,
          totalKills: attackerPlayer.totalKills + 1,
        });
      }
    }

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

  // Also increment kills if the attacker was killed (defender got the kill)
  if (newAttackerHealth <= 0 && newDefenderHealth > 0) {
    const defenderPlayer = state.players.get(defender.owner);
    if (defenderPlayer) {
      updatedPlayers.set(defenderPlayer.id, {
        ...defenderPlayer,
        totalKills: defenderPlayer.totalKills + 1,
      });
    }
  }

  return {
    ...state,
    units: updatedUnits,
    players: updatedPlayers,
    log: logEntries,
    rng: currentRng,
    lastValidation: null,
  };
}

/** Get base combat strength, reduced by health using discrete -1 CS per 10 HP lost */
function getEffectiveCombatStrength(state: GameState, unit: UnitState, isAttacking: boolean, defenderPosition?: HexCoord, attackerTile?: HexTile | null): number {
  const base = getBaseCombatStrength(state, unit.typeId, isAttacking);
  // B7: Discrete HP degradation — rulebook §6.3: "For every 10 HP lost, -1 CS" (flat subtraction, not multiplier)
  const healthPenalty = Math.floor((100 - unit.health) / 10);
  const flankingBonus = (isAttacking && defenderPosition) ? calculateFlankingBonus(unit, defenderPosition, state) : 0;
  // First Strike bonus: +5 combat strength when attacking at full HP
  const firstStrikeBonus = isAttacking && unit.health === 100 ? 5 : 0;
  // B1: River penalty applies to ATTACKER attacking from a river tile (rulebook §6.4: -2 CS flat)
  const riverPenalty = (isAttacking && attackerTile && attackerTile.river.length > 0) ? 2 : 0;
  // S6: War support CS penalty: -1 CS per negative war support point (cap at -10)
  const warSupportPenalty = calculateWarSupportPenalty(state, unit.owner);
  // Civ/leader/legacy combat bonuses (MODIFY_COMBAT effects)
  const unitDef = state.config.units.get(unit.typeId);
  const category = unitDef?.category ?? 'melee';
  const effectBonus = getCombatBonus(state, unit.owner, category);
  return base - healthPenalty + flankingBonus + firstStrikeBonus + effectBonus - riverPenalty - warSupportPenalty;
}

/**
 * Calculate the war support CS penalty for a player.
 * If the player is losing in war support (i.e., the war is going badly for them),
 * they receive -1 CS per negative war support point, capped at -10.
 *
 * warSupport > 0 = attacker advantage; warSupport < 0 = defender advantage.
 * Penalise the player who is at a disadvantage:
 *   - Attacker (key prefix matches playerId): penalised when warSupport < 0
 *   - Defender (key suffix matches playerId): penalised when warSupport > 0
 * Cap at 10 CS penalty.
 */
function calculateWarSupportPenalty(state: GameState, playerId: string): number {
  let maxPenalty = 0;
  for (const [key, rel] of state.diplomacy.relations) {
    if (rel.status !== 'war') continue;
    if (!key.includes(playerId)) continue;

    // Key format: "p1:p2" where p1 is the war declarer
    const [p1] = key.split(':');
    const isAttacker = p1 === playerId;

    // warSupport > 0 means attacker has advantage; warSupport < 0 means defender has advantage.
    // If this player is the attacker and warSupport < 0, attacker is at disadvantage → penalise.
    // If this player is the defender and warSupport > 0, defender is at disadvantage → penalise.
    const negativeSupport = isAttacker
      ? Math.max(0, -rel.warSupport)   // attacker: penalised when warSupport < 0
      : Math.max(0, rel.warSupport);   // defender: penalised when warSupport > 0

    const penalty = Math.min(10, negativeSupport);
    if (penalty > maxPenalty) maxPenalty = penalty;
  }
  return maxPenalty;
}

/** Get effective defense strength with terrain and fortification bonuses */
function getEffectiveDefenseStrength(state: GameState, unit: UnitState, tile: HexTile | null): number {
  const base = getBaseCombatStrength(state, unit.typeId, false);
  // B7: Discrete HP degradation — rulebook §6.3: "For every 10 HP lost, -1 CS" (flat subtraction, not multiplier)
  const healthPenalty = Math.floor((100 - unit.health) / 10);
  let strength = base - healthPenalty;

  // Terrain defense bonus
  if (tile) {
    const terrainBonus = getTerrainDefenseBonus(state, tile);
    strength *= (1 + terrainBonus);
  }

  // B6: Fortification bonus is flat +5 CS additive (not +50% multiplicative)
  if (unit.fortified) {
    strength += 5;
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

/** Flanking bonus: +2 strength per friendly unit adjacent to the defender, capped at +6 */
function calculateFlankingBonus(attacker: UnitState, defenderPosition: HexCoord, state: GameState): number {
  const defNeighbors = neighbors(defenderPosition);
  let flankingCount = 0;
  for (const [, u] of state.units) {
    if (u.id === attacker.id) continue;           // exclude the attacker itself
    if (u.owner !== attacker.owner) continue;      // only count friendly units
    const isAdjacent = defNeighbors.some(n => n.q === u.position.q && n.r === u.position.r);
    if (isAdjacent) flankingCount++;
  }
  return Math.min(flankingCount * 2, 6);
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

// ── City Combat ──

/**
 * Get city defense strength.
 * Base = 10, +15 if city has 'walls' building.
 */
function getCityDefenseStrength(city: CityState): number {
  const base = 10;
  const wallsBonus = city.buildings.includes('walls') ? 15 : 0;
  return base + wallsBonus;
}

/**
 * Handle ATTACK_CITY action.
 * Units can attack cities to reduce their defenseHP.
 * If defenseHP reaches 0 and a melee unit delivered the final blow, the city is conquered.
 * Ranged/siege units can damage but not capture.
 * City retaliates like a ranged attack (range 2, strength = defense strength).
 */
function handleAttackCity(
  state: GameState,
  action: { readonly type: 'ATTACK_CITY'; readonly attackerId: string; readonly cityId: string },
): GameState {
  const attacker = state.units.get(action.attackerId);
  const city = state.cities.get(action.cityId);
  if (!attacker || !city) return createInvalidResult(state, 'Attacker or city not found', 'combat');
  if (attacker.owner !== state.currentPlayerId) return createInvalidResult(state, 'Not your unit or turn', 'combat');
  if (attacker.owner === city.owner) return createInvalidResult(state, 'Cannot attack own city', 'combat');
  if (attacker.movementLeft <= 0) return createInvalidResult(state, 'Unit has already attacked this turn', 'combat');

  // Determine attacker range
  const attackerRange = getUnitRange(state, attacker.typeId) + getPromotionRangeBonus(state, attacker);
  const baseRange = getUnitRange(state, attacker.typeId);
  const dist = distance(attacker.position, city.position);

  if (baseRange === 0) {
    // Melee: must be adjacent
    if (dist !== 1) return createInvalidResult(state, 'Target out of melee range', 'combat');
  } else {
    // Ranged/siege: must be within range
    if (dist > attackerRange || dist === 0) return createInvalidResult(state, 'Target out of attack range', 'combat');
  }

  const isMelee = baseRange === 0;
  const cityDefense = getCityDefenseStrength(city);

  // Attacker effective strength
  const attackerPromoBonus = getPromotionCombatBonus(state, attacker, {
    isAttacking: true,
    targetWounded: city.defenseHP < (city.buildings.includes('walls') ? 200 : 100),
    targetFortified: false,
    adjacentAlly: false,
    targetIsWalls: city.buildings.includes('walls'),
  });
  const attackerTileForCity = state.map.tiles.get(coordToKey(attacker.position));
  const attackerStrength = getEffectiveCombatStrength(state, attacker, true, undefined, attackerTileForCity) + attackerPromoBonus;

  // Calculate damage to city
  const strengthDiff = attackerStrength - cityDefense;
  const { value: randomFactor1, rng: rng1 } = nextRandom(state.rng);
  const modifier1 = 0.75 + randomFactor1 * 0.5;
  const damageToCity = Math.round(30 * Math.exp(strengthDiff / 25) * modifier1);

  // City retaliates (ranged, range 2, strength = cityDefense)
  const { value: randomFactor2, rng: rng2 } = nextRandom(rng1);
  const modifier2 = 0.75 + randomFactor2 * 0.5;
  const retaliationStrengthDiff = cityDefense - attackerStrength;
  // Ranged retaliation: only hits melee attackers (adjacent), ranged attackers take no retaliation
  const damageToAttacker = isMelee
    ? Math.round(30 * Math.exp(retaliationStrengthDiff / 25) * modifier2)
    : 0;

  let currentRng = rng2;

  const newCityHP = Math.max(0, city.defenseHP - damageToCity);
  const newAttackerHealth = Math.max(0, attacker.health - damageToAttacker);

  const updatedUnits = new Map(state.units);
  const updatedCities = new Map(state.cities);
  const updatedPlayers = new Map(state.players);
  const logEntries = [...state.log];

  // Update attacker
  if (newAttackerHealth <= 0) {
    updatedUnits.delete(attacker.id);
    logEntries.push({
      turn: state.turn,
      playerId: state.currentPlayerId,
      message: `${attacker.typeId} was destroyed attacking ${city.name}`,
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

  // Update city
  if (newCityHP <= 0 && isMelee && newAttackerHealth > 0) {
    // City conquered — transfer ownership
    const previousOwner = city.owner;
    updatedCities.set(city.id, {
      ...city,
      owner: attacker.owner,
      defenseHP: 0,
    });

    // Move melee attacker into city position
    const movedAttacker = updatedUnits.get(attacker.id);
    if (movedAttacker) {
      updatedUnits.set(attacker.id, {
        ...movedAttacker,
        position: city.position,
      });
    }

    logEntries.push({
      turn: state.turn,
      playerId: state.currentPlayerId,
      message: `${attacker.typeId} conquered ${city.name}!`,
      type: 'combat',
    });
  } else {
    // City not captured — update defenseHP
    updatedCities.set(city.id, {
      ...city,
      defenseHP: newCityHP,
    });

    logEntries.push({
      turn: state.turn,
      playerId: state.currentPlayerId,
      message: `${attacker.typeId} attacked ${city.name} (${newCityHP} defense HP remaining)`,
      type: 'combat',
    });
  }

  return {
    ...state,
    units: updatedUnits,
    cities: updatedCities,
    players: updatedPlayers,
    log: logEntries,
    rng: currentRng,
    lastValidation: null,
  };
}

/**
 * Helper function to create an invalid result with validation reason
 */
function createInvalidResult(
  state: GameState,
  reason: string,
  category: 'movement' | 'combat' | 'production' | 'general',
): GameState {
  return {
    ...state,
    lastValidation: { valid: false, reason, category },
    log: state.log, // Keep log unchanged
  };
}
