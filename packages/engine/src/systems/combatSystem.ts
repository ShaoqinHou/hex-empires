import type { GameState, GameAction, UnitState, HexTile, CityState, DiplomacyRelation } from '../types/GameState';
import type { HexCoord } from '../types/HexCoord';
import { coordToKey, neighbors, distance } from '../hex/HexMath';
import { getPromotionCombatBonus, getPromotionDefenseBonus, getPromotionRangeBonus } from '../state/PromotionUtils';
import { nextRandom } from '../state/SeededRng';
import { getCombatBonus, getWarSupportBonus } from '../state/EffectUtils';
import { computeEffectiveCS } from '../state/CombatAnalytics';
import { getCommanderAuraCombatBonus } from '../state/CommanderAura';
import type { ActiveTreaty } from '../types/Treaty';
import { getRelationKey, defaultRelation } from '../state/DiplomacyUtils';

/**
 * AA2.2 (F-06): denounce_military_presence — -25% multiplicative CS penalty.
 * Applies to the sanctioned player's (targetPlayerId) units when they fight
 * near the declaring player's (declaringPlayerId) cities.
 * The "near" definition is: any active treaty of this type exists; we apply
 * the penalty globally (simplest, rulebook-consistent interpretation for now).
 *
 * Returns true if unitOwner is the target of an active denounce_military_presence
 * treaty declared by opponentOwner.
 */
function hasDenouncePresencePenalty(unitOwner: string, opponentOwner: string, state: GameState): boolean {
  const treaties: ReadonlyArray<ActiveTreaty> = state.diplomacy.activeTreaties ?? [];
  for (const t of treaties) {
    if (t.status !== 'active') continue;
    if (t.treatyId !== 'denounce_military_presence') continue;
    // The declarer proposed; the target is the sanctioned player.
    if (t.proposerId === opponentOwner && t.targetId === unitOwner) return true;
    // Also check reversed party positions (treaties are accepted by target)
    if (t.proposerId === opponentOwner && t.targetId === unitOwner) return true;
  }
  return false;
}

/**
 * CombatSystem handles unit attacks (both unit-vs-unit and unit-vs-city).
 * Combat formula (Civ-style):
 * - Damage = 30 * e^(strengthDiff / 25)
 * - strengthDiff = attacker effective strength - defender effective strength
 * - Modifiers: terrain defense, fortification, flanking, health penalty
 */
export function combatSystem(state: GameState, action: GameAction): GameState {
  if (action.type === 'ATTACK_CITY') return handleAttackCity(state, action);
  if (action.type === 'ATTACK_DISTRICT') return handleAttackDistrict(state, action);
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
  const attackerBaseStrength = getEffectiveCombatStrength(state, attacker, true, defender.position, attackerTile, defender) + attackerPromoBonus;
  const defenderBaseStrength = getEffectiveDefenseStrength(state, defender, defenderTile ?? null) + defenderPromoBonus + defenderFortifyPromoBonus;

  // AA2.2 (F-06): denounce_military_presence — applies -25% CS to the sanctioned player's unit.
  // If the defender's owner has an active treaty against the attacker's owner, attacker gets -25%.
  // If the attacker's owner has an active treaty against the defender's owner, defender gets -25%.
  const attackerDenounced = hasDenouncePresencePenalty(attacker.owner, defender.owner, state);
  const defenderDenounced = hasDenouncePresencePenalty(defender.owner, attacker.owner, state);
  const attackerStrength = attackerDenounced ? Math.floor(attackerBaseStrength * 0.75) : attackerBaseStrength;
  const defenderStrength = defenderDenounced ? Math.floor(defenderBaseStrength * 0.75) : defenderBaseStrength;

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
    // If the attacker was the current player's own unit, this is a critical event
    const attackerIsOwnUnit = attacker.owner === state.currentPlayerId;
    logEntries.push({
      turn: state.turn,
      playerId: state.currentPlayerId,
      message: `${attacker.typeId} was destroyed attacking ${defender.typeId}`,
      type: 'combat',
      severity: attackerIsOwnUnit ? 'critical' : 'info',
      blocksTurn: attackerIsOwnUnit ? true : undefined,
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
    // If the defender was the current player's own unit (rare, but possible via multi-player), mark critical
    const defenderIsOwnUnit = defender.owner === state.currentPlayerId;
    logEntries.push({
      turn: state.turn,
      playerId: state.currentPlayerId,
      message: `${attacker.typeId} destroyed ${defender.typeId}!`,
      type: 'combat',
      severity: defenderIsOwnUnit ? 'critical' : 'info',
      blocksTurn: defenderIsOwnUnit ? true : undefined,
    });

    // Increment totalKills and ideologyPoints for the attacker's owner
    if (newAttackerHealth > 0) {
      const attackerPlayer = state.players.get(attacker.owner);
      if (attackerPlayer) {
        // Y1.1: award 1 ideologyPoint per kill if attacker has selected a Modern Ideology civic
        const ideologyBonus = attackerPlayer.ideology != null ? 1 : 0;
        updatedPlayers.set(attackerPlayer.id, {
          ...attackerPlayer,
          totalKills: attackerPlayer.totalKills + 1,
          ideologyPoints: (attackerPlayer.ideologyPoints ?? 0) + ideologyBonus,
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
    // F-11 (W8): Retreat mechanic — melee combat only.
    // If defender HP drops below 25% and there is an adjacent unoccupied hex,
    // move defender 1 hex away BEFORE final HP is committed to state.
    let retreatPosition: HexCoord | null = null;
    if (attackerRange === 0 && newDefenderHealth < 25) {
      retreatPosition = findRetreatHex(defender.position, state, updatedUnits);
    }

    const finalDefenderPosition = retreatPosition ?? defender.position;

    updatedUnits.set(defender.id, {
      ...defender,
      health: newDefenderHealth,
      experience: defender.experience + 3,
      position: finalDefenderPosition,
    });

    if (retreatPosition) {
      logEntries.push({
        turn: state.turn,
        playerId: state.currentPlayerId,
        message: `${defender.typeId} retreated to (${retreatPosition.q}, ${retreatPosition.r}) after taking heavy damage`,
        type: 'combat',
        severity: 'info',
      });
    } else {
      logEntries.push({
        turn: state.turn,
        playerId: state.currentPlayerId,
        message: `${attacker.typeId} attacked ${defender.typeId} (${newDefenderHealth}HP remaining)`,
        type: 'combat',
        severity: 'info',
      });
    }
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

/**
 * F-03 (W4-05): Returns empire-resource combat mods for the given player at the current age.
 * Only resources with type 'empire' in their bonusTable entry contribute combatMod.
 */
function playerResourceCombatMods(
  state: GameState,
  playerId: string,
): ReadonlyArray<{ readonly unitCategory: string; readonly value: number; readonly versusCategory?: string }> {
  const player = state.players.get(playerId);
  if (!player) return [];
  const owned = (player as typeof player & { readonly ownedResources?: ReadonlyArray<string> }).ownedResources;
  if (!owned || owned.length === 0) return [];
  const mods: Array<{ readonly unitCategory: string; readonly value: number; readonly versusCategory?: string }> = [];
  const currentAge = state.age.currentAge;
  for (const resId of owned) {
    const resDef = state.config.resources.get(resId);
    const row = resDef?.bonusTable?.[currentAge];
    if (row?.combatMod) {
      mods.push(row.combatMod);
    }
  }
  return mods;
}

/**
 * Sum all empire-resource combat bonuses for a player's unit of the given category.
 * `versusCategory` restricts the mod to apply only when fighting a specific unit category.
 */
function calculateResourceCombatBonus(
  state: GameState,
  playerId: string,
  unitCategory: string,
  defenderUnit: UnitState | undefined,
): number {
  const mods = playerResourceCombatMods(state, playerId);
  let bonus = 0;
  for (const mod of mods) {
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
 * Get effective combat strength for an attacking unit.
 * Uses computeEffectiveCS (VII: multiplicative HP scaling) so combat resolution
 * and CombatPreview display agree on the same formula.
 */
function getEffectiveCombatStrength(state: GameState, unit: UnitState, isAttacking: boolean, defenderPosition?: HexCoord, attackerTile?: HexTile | null, defenderUnit?: UnitState): number {
  const base = getBaseCombatStrength(state, unit.typeId, isAttacking);
  // VII: health scales CS multiplicatively — computeEffectiveCS(base, hp) = floor(base * hp/100)
  const effectiveBase = computeEffectiveCS(base, unit.health);
  const flankingBonus = (isAttacking && defenderPosition) ? calculateFlankingBonus(unit, defenderPosition, state) : 0;
  // Y5.2 (F-08): River-crossing penalty — if attacker crosses a river edge to attack,
  // apply -25% multiplicative CS penalty (standard Civ river crossing rule).
  // Checks the specific edge on the attacker's tile that faces the defender.
  const crossingRiver = isAttacking && attackerTile && defenderPosition
    ? isRiverEdgeBetween(attackerTile, unit.position, defenderPosition)
    : false;
  // S6: War support CS penalty: -1 CS per negative war support point (cap at -10)
  const warSupportPenalty = calculateWarSupportPenalty(state, unit.owner);
  // Civ/leader/legacy combat bonuses (MODIFY_COMBAT effects)
  const unitDef = state.config.units.get(unit.typeId);
  const category = unitDef?.category ?? 'melee';
  const effectBonus = getCombatBonus(state, unit.owner, category);
  // F-03 (W4-05): Empire resource combat strength modifiers
  const resourceBonus = calculateResourceCombatBonus(state, unit.owner, category, defenderUnit);
  // Commander aura: +3 CS per friendly commander within 2 hexes (F-04 base + promotion stacks)
  const commanderAuraBonus = getCommanderAuraCombatBonus(state, unit.position, unit.owner);
  // Y5.3 (F-05): Adjacent friendly support bonus — +2 CS per adjacent friendly unit.
  const supportBonus = isAttacking ? calculateSupportBonus(unit, state) : 0;
  const baseTotal = effectiveBase + flankingBonus + effectBonus + resourceBonus + commanderAuraBonus + supportBonus - warSupportPenalty;
  // Apply river-crossing penalty as multiplicative -25%
  return crossingRiver ? Math.floor(baseTotal * 0.75) : baseTotal;
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

    const penalty = Math.max(0, Math.min(10, negativeSupport) - getWarSupportBonus(state, playerId));
    if (penalty > maxPenalty) maxPenalty = penalty;
  }
  return maxPenalty;
}

/**
 * Get effective defense strength with terrain and fortification bonuses.
 * Uses computeEffectiveCS (VII: multiplicative HP scaling) so combat resolution
 * and CombatPreview display agree on the same formula.
 */
function getEffectiveDefenseStrength(state: GameState, unit: UnitState, tile: HexTile | null): number {
  const base = getBaseCombatStrength(state, unit.typeId, false);
  // VII: health scales CS multiplicatively — computeEffectiveCS(base, hp) = floor(base * hp/100)
  let strength = computeEffectiveCS(base, unit.health);

  // Terrain defense bonus — multiplicative component on base strength
  if (tile) {
    const { percent, flat } = getTerrainDefenseBonus(state, tile);
    strength *= (1 + percent);
    strength += flat;
  }

  // B6: Fortification bonus is flat +5 CS additive (not +50% multiplicative)
  if (unit.fortified) {
    strength += 5;
  }

  // F-07: Adjacent friendly units provide +2 CS each (defensive support).
  const supportBonus = calculateSupportBonus(unit, state);
  strength += supportBonus;

  // Commander aura: +3 CS per friendly commander within 2 hexes
  const commanderAuraBonus = getCommanderAuraCombatBonus(state, unit.position, unit.owner);
  strength += commanderAuraBonus;

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
function getTerrainDefenseBonus(state: GameState, tile: HexTile): { percent: number; flat: number } {
  let percent = 0;
  let flat = 0;
  // Terrain base defense (multiplicative)
  const terrainDef = state.config.terrains.get(tile.terrain);
  percent += terrainDef?.defenseBonus ?? 0;

  // Feature defense bonus — supports both multiplicative and flat CS (rulebook §6.4)
  if (tile.feature) {
    const featureDef = state.config.features.get(tile.feature);
    percent += featureDef?.defenseBonusModifier ?? 0;
    flat += featureDef?.flatDefenseBonus ?? 0;
  }

  return { percent, flat };
}

/**
 * Flanking bonus per rulebook §6.7 + VII directional battlefront model (W4-03):
 *
 * Directional model (when defender has facing):
 *   - If the attacker is in the defender's rear arc (opposite to defender.facing ±1 direction),
 *     grant +5 CS rear-flank bonus (VII rear attack).
 *   - Otherwise fall through to the legacy count-based support bonus.
 *
 * Legacy / support model (when defender lacks facing or attacker is not in rear arc):
 *   - Requires military_training tech (F9).
 *   - Attacker must be melee/cavalry (F7).
 *   - Requires 2+ friendly MILITARY units adjacent to defender (F2, F5).
 *   - +2 CS per qualifying flanker, capped at +6 (3 flankers).
 */
function calculateFlankingBonus(attacker: UnitState, defenderPosition: HexCoord, state: GameState): number {
  // F7: attacker must be melee/cavalry for any flanking to apply.
  const attackerDef = state.config.units.get(attacker.typeId);
  const attackerCategory = attackerDef?.category;
  if (attackerCategory !== 'melee' && attackerCategory !== 'cavalry') return 0;

  // Directional rear-flank check: requires the defender unit to have a known facing.
  const defender = findUnitAtPosition(defenderPosition, state);
  if (defender && defender.facing !== undefined) {
    const attackAngleDir = hexDirectionIndex(defenderPosition, attacker.position);
    if (attackAngleDir !== -1) {
      // Rear arc: 3 directions centred on the direction OPPOSITE to defender's facing.
      const oppositeDir = (defender.facing + 3) % 6;
      if (isInRearArc(attackAngleDir, oppositeDir)) {
        return 5; // VII rear-flank = +5 CS
      }
    }
  }

  // Legacy count-based support bonus (no facing or not a rear attack).
  // F9: attacker's owner must have researched Military Training.
  const attackerPlayer = state.players.get(attacker.owner);
  if (!attackerPlayer) return 0;
  if (!attackerPlayer.researchedTechs.includes('military_training')) return 0;

  const defNeighbors = neighbors(defenderPosition);
  let flankingCount = 0;
  for (const [, u] of state.units) {
    if (u.id === attacker.id) continue;           // exclude the attacker itself
    if (u.owner !== attacker.owner) continue;      // only count friendly units
    // F5: civilians and religious units do not contribute to flanking.
    const uDef = state.config.units.get(u.typeId);
    const uCategory = uDef?.category;
    if (uCategory === 'civilian' || uCategory === 'religious') continue;
    const isAdjacent = defNeighbors.some(n => n.q === u.position.q && n.r === u.position.r);
    if (isAdjacent) flankingCount++;
  }
  // F2: rulebook requires 2+ friendly flankers — a single flanker grants nothing.
  if (flankingCount < 2) return 0;
  // Y5.1: +3 CS per flanking ally, capped at +9 (max 3 effective flankers)
  return Math.min(flankingCount * 3, 9);
}

/**
 * Find a unit located at the given hex position.
 * Used to look up the defender's facing for directional flanking.
 */
function findUnitAtPosition(position: HexCoord, state: GameState): UnitState | undefined {
  for (const [, u] of state.units) {
    if (u.position.q === position.q && u.position.r === position.r) return u;
  }
  return undefined;
}

/**
 * Returns the HEX_DIRECTIONS index (0–5) for the direction from `from` to `to`
 * when they are exactly adjacent, or -1 if not adjacent or not a unit-step direction.
 * HEX_DIRECTIONS: 0=E, 1=NE, 2=NW, 3=W, 4=SW, 5=SE
 */
function hexDirectionIndex(from: HexCoord, to: HexCoord): number {
  const dq = to.q - from.q;
  const dr = to.r - from.r;
  const HEX_DIRECTIONS = [
    { q: 1, r: 0 },   // 0 E
    { q: 1, r: -1 },  // 1 NE
    { q: 0, r: -1 },  // 2 NW
    { q: -1, r: 0 },  // 3 W
    { q: -1, r: 1 },  // 4 SW
    { q: 0, r: 1 },   // 5 SE
  ];
  return HEX_DIRECTIONS.findIndex(d => d.q === dq && d.r === dr);
}

/**
 * Returns true if `attackDir` is within the rear arc centred on `oppositeDir`.
 * The rear arc covers 3 directions: oppositeDir-1, oppositeDir, oppositeDir+1 (mod 6).
 * This is a 180° rear half-plane in hex direction space.
 */
function isInRearArc(attackDir: number, oppositeDir: number): boolean {
  const diff = ((attackDir - oppositeDir) + 6) % 6;
  // diff === 0 → directly behind; diff === 1 → one step CW; diff === 5 → one step CCW
  return diff === 0 || diff === 1 || diff === 5;
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
  const updatedRoutes = new Map(state.tradeRoutes);
  const updatedDiplomacyRelations = new Map(state.diplomacy.relations);
  const logEntries = [...state.log];

  // Update attacker
  if (newAttackerHealth <= 0) {
    updatedUnits.delete(attacker.id);
    const attackerIsOwnUnit = attacker.owner === state.currentPlayerId;
    logEntries.push({
      turn: state.turn,
      playerId: state.currentPlayerId,
      message: `${attacker.typeId} was destroyed attacking ${city.name}`,
      type: 'combat',
      severity: attackerIsOwnUnit ? 'critical' : 'info',
      blocksTurn: attackerIsOwnUnit ? true : undefined,
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
    // U2: track originalOwner (first non-founder owner) for provenance
    // AA1.2: set wasConquered = true (convenient boolean for systems/LegacyPaths)
    const previousOwner = city.owner;
    updatedCities.set(city.id, {
      ...city,
      owner: attacker.owner,
      originalOwner: city.originalOwner ?? city.owner,
      wasConquered: true,
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

    // Y1.3: cancel all trade routes to the captured city (city ownership changed)
    for (const [routeId, route] of state.tradeRoutes) {
      if (route.to === city.id) {
        updatedUnits.delete(route.caravanUnitId);
        updatedRoutes.delete(routeId);
      }
    }

    // Y1.1: capital city capture awards +5 ideologyPoints to attacker (if ideology civic researched)
    const attackerPlayerForCapture = updatedPlayers.get(attacker.owner);
    if (attackerPlayerForCapture && attackerPlayerForCapture.ideology != null && city.isCapital) {
      updatedPlayers.set(attacker.owner, {
        ...attackerPlayerForCapture,
        ideologyPoints: (attackerPlayerForCapture.ideologyPoints ?? 0) + 5,
      });
    }

    // Critical for the city's previous owner (defender); just informational for the attacker
    const captureIsOwnLoss = previousOwner === state.currentPlayerId;
    logEntries.push({
      turn: state.turn,
      playerId: state.currentPlayerId,
      message: `${attacker.typeId} conquered ${city.name}!`,
      type: 'combat',
      severity: captureIsOwnLoss ? 'critical' : 'warning',
      blocksTurn: captureIsOwnLoss ? true : undefined,
    });

    // F-11: append "city_captured" opinion modifier to this pair's ledger
    if (previousOwner !== attacker.owner) {
      const capRelKey = getRelationKey(previousOwner, attacker.owner);
      const capRelCurrent: DiplomacyRelation = updatedDiplomacyRelations.get(capRelKey) ?? defaultRelation();
      const existingLedger = capRelCurrent.ledger ?? [];
      const newEntry = {
        id: 'city_captured',
        value: -40,
        turnApplied: state.turn,
        turnExpires: state.turn + 30,
        reason: `Captured our city (${city.name})`,
      };
      const updatedLedger = [...existingLedger, newEntry].slice(-50);
      updatedDiplomacyRelations.set(capRelKey, { ...capRelCurrent, ledger: updatedLedger });
    }
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
      severity: 'info',
    });
  }

  return {
    ...state,
    units: updatedUnits,
    cities: updatedCities,
    players: updatedPlayers,
    tradeRoutes: updatedRoutes,
    diplomacy: { ...state.diplomacy, relations: updatedDiplomacyRelations },
    log: logEntries,
    rng: currentRng,
    lastValidation: null,
  };
}

/**
 * Handle ATTACK_DISTRICT action (W4-03: multi-district siege HP model).
 *
 * Attackers target individual district tiles (keyed in city.districtHPs).
 * Each urban district has 100 HP; city_center has 200 HP.
 * CAPTURE_CITY is only possible when all non-center districts are destroyed
 * (i.e. reduced to 0 HP) — this function reduces the targeted district's HP.
 * The city_center (key = coordToKey(city.position)) must be the last district standing.
 */
function handleAttackDistrict(
  state: GameState,
  action: { readonly type: 'ATTACK_DISTRICT'; readonly attackerId: string; readonly cityId: string; readonly districtTile: string },
): GameState {
  const attacker = state.units.get(action.attackerId);
  const city = state.cities.get(action.cityId);
  if (!attacker || !city) return createInvalidResult(state, 'Attacker or city not found', 'combat');
  if (attacker.owner !== state.currentPlayerId) return createInvalidResult(state, 'Not your unit or turn', 'combat');
  if (attacker.owner === city.owner) return createInvalidResult(state, 'Cannot attack own city', 'combat');
  if (attacker.movementLeft <= 0) return createInvalidResult(state, 'Unit has already attacked this turn', 'combat');

  // Build initial districtHPs if not yet present (first attack triggers the model)
  const districtHPs: Map<string, number> = city.districtHPs
    ? new Map(city.districtHPs)
    : buildInitialDistrictHPs(city);

  // Validate the target district tile exists
  const currentDistrictHP = districtHPs.get(action.districtTile);
  if (currentDistrictHP === undefined) {
    return createInvalidResult(state, 'Target district tile not found in city', 'combat');
  }
  if (currentDistrictHP <= 0) {
    return createInvalidResult(state, 'District already destroyed', 'combat');
  }

  // City center cannot be attacked while non-center districts still stand
  const cityCenter = coordToKey(city.position);
  if (action.districtTile === cityCenter) {
    const hasStandingNonCenter = [...districtHPs.entries()].some(
      ([key, hp]) => key !== cityCenter && hp > 0,
    );
    if (hasStandingNonCenter) {
      return createInvalidResult(state, 'Must destroy all outer districts before attacking the city center', 'combat');
    }
  }

  // Attacker must be adjacent or in range
  const attackerRange = getUnitRange(state, attacker.typeId) + getPromotionRangeBonus(state, attacker);
  const baseRange = getUnitRange(state, attacker.typeId);
  // Parse district tile back to HexCoord for distance check
  const [dq, dr] = action.districtTile.split(',').map(Number);
  const districtPos: HexCoord = { q: dq, r: dr };
  const dist = distance(attacker.position, districtPos);

  if (baseRange === 0) {
    if (dist !== 1) return createInvalidResult(state, 'Target out of melee range', 'combat');
  } else {
    if (dist > attackerRange || dist === 0) return createInvalidResult(state, 'Target out of attack range', 'combat');
  }

  // Calculate damage to district
  const attackerTile = state.map.tiles.get(coordToKey(attacker.position));
  const attackerStrength = getEffectiveCombatStrength(state, attacker, true, undefined, attackerTile);
  const districtDefense = action.districtTile === cityCenter
    ? getCityDefenseStrength(city)
    : 10; // Outer districts have base defense 10

  const strengthDiff = attackerStrength - districtDefense;
  const { value: randomFactor1, rng: rng1 } = nextRandom(state.rng);
  const modifier1 = 0.75 + randomFactor1 * 0.5;
  const damageToDistrict = Math.round(30 * Math.exp(strengthDiff / 25) * modifier1);

  const newDistrictHP = Math.max(0, currentDistrictHP - damageToDistrict);
  districtHPs.set(action.districtTile, newDistrictHP);

  // City retaliates on melee attackers
  const isMelee = baseRange === 0;
  const { value: randomFactor2, rng: rng2 } = nextRandom(rng1);
  const modifier2 = 0.75 + randomFactor2 * 0.5;
  const retaliationStrengthDiff = districtDefense - attackerStrength;
  const damageToAttacker = isMelee
    ? Math.round(30 * Math.exp(retaliationStrengthDiff / 25) * modifier2)
    : 0;

  const newAttackerHealth = Math.max(0, attacker.health - damageToAttacker);

  const updatedUnits = new Map(state.units);
  const updatedCities = new Map(state.cities);
  const logEntries = [...state.log];

  // Update attacker
  if (newAttackerHealth <= 0) {
    updatedUnits.delete(attacker.id);
    logEntries.push({
      turn: state.turn,
      playerId: state.currentPlayerId,
      message: `${attacker.typeId} was destroyed attacking a district in ${city.name}`,
      type: 'combat',
      severity: 'critical',
      blocksTurn: true,
    });
  } else {
    updatedUnits.set(attacker.id, {
      ...attacker,
      health: newAttackerHealth,
      movementLeft: 0,
      experience: attacker.experience + 5,
    });
  }

  // Update city
  updatedCities.set(city.id, {
    ...city,
    districtHPs,
  });

  const districtLabel = action.districtTile === cityCenter ? 'city center' : 'district';
  if (newDistrictHP <= 0) {
    logEntries.push({
      turn: state.turn,
      playerId: state.currentPlayerId,
      message: `${attacker.typeId} destroyed a ${districtLabel} in ${city.name}!`,
      type: 'combat',
      severity: 'warning',
    });
  } else {
    logEntries.push({
      turn: state.turn,
      playerId: state.currentPlayerId,
      message: `${attacker.typeId} attacked a ${districtLabel} in ${city.name} (${newDistrictHP} HP remaining)`,
      type: 'combat',
      severity: 'info',
    });
  }

  return {
    ...state,
    units: updatedUnits,
    cities: updatedCities,
    log: logEntries,
    rng: rng2,
    lastValidation: null,
  };
}

/**
 * Build the initial districtHPs map for a city that has not yet been attacked.
 * City center (city.position key) = 200 HP; each urban district tile = 100 HP.
 * Falls back to just the city center when no urbanTiles are present.
 */
function buildInitialDistrictHPs(city: CityState): Map<string, number> {
  const hps = new Map<string, number>();
  const centerKey = coordToKey(city.position);
  hps.set(centerKey, 200);

  if (city.urbanTiles) {
    for (const [tileKey] of city.urbanTiles) {
      if (tileKey !== centerKey) {
        hps.set(tileKey, 100);
      }
    }
  }

  return hps;
}

/**
 * F-11 (W8): Find a retreat hex for a unit that has taken heavy melee damage.
 *
 * Returns the first adjacent passable (not occupied) hex, or null if no such
 * hex exists (surrounded / no escape).
 *
 * "Passable" is defined as: the tile exists in the map AND no unit currently
 * occupies that hex (using the live updatedUnits map so same-turn movements are visible).
 */
function findRetreatHex(
  position: HexCoord,
  state: GameState,
  updatedUnits: Map<string, UnitState>,
): HexCoord | null {
  const adjacentHexes = neighbors(position);

  // Build a set of occupied hex keys from the live unit map
  const occupiedKeys = new Set<string>();
  for (const unit of updatedUnits.values()) {
    occupiedKeys.add(coordToKey(unit.position));
  }

  for (const hex of adjacentHexes) {
    const key = coordToKey(hex);
    // Tile must exist and not be occupied
    if (!state.map.tiles.has(key)) continue;
    if (occupiedKeys.has(key)) continue;
    return hex;
  }
  return null;
}

/**
 * Y5.2 (F-08): Checks whether there is a river on the edge between attacker and defender.
 * HEX_DIRECTIONS: 0=E, 1=NE, 2=NW, 3=W, 4=SW, 5=SE.
 * Returns true if the attacker's tile has a river mark on the edge facing the defender.
 */
function isRiverEdgeBetween(
  attackerTile: HexTile,
  attackerPos: HexCoord,
  defenderPos: HexCoord,
): boolean {
  const edgeIndex = hexDirectionIndex(attackerPos, defenderPos);
  if (edgeIndex === -1) return false; // not adjacent — no edge river applies
  return attackerTile.river.includes(edgeIndex);
}

/**
 * F-07: Adjacent friendly support bonus.
 *
 * Every adjacent friendly unit contributes +2 CS. The attacker/defender both use
 * this same additive bonus when counting units adjacent to their own tile.
 */
function calculateSupportBonus(attacker: UnitState, state: GameState): number {
  let supportCount = 0;
  const adjHexes = neighbors(attacker.position);
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
