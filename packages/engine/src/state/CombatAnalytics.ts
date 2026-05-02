import type { GameState, UnitCategory, UnitState } from '../types/GameState';
import type { HexCoord } from '../types/HexCoord';
import type { PlayerId } from '../types/Ids';
import { hasCommanderGrantedAbility } from './CommanderAura';

/**
 * Computes effective combat strength given base CS and current HP.
 * VII: wounded units suffer an additive CS penalty, not multiplicative scaling.
 * The penalty follows the surfaced Civ VII formula round(10 - HP / 10), capped
 * to 0..10, so combat resolution and preview display agree.
 *
 * Formula: effectiveCS = baseCS - woundedPenalty
 * e.g. computeEffectiveCS(30, 50) === 25
 */
export function computeEffectiveCS(baseCS: number, hp: number, maxHP: number = 100): number {
  const normalizedHp = maxHP > 0
    ? Math.max(0, Math.min(hp, maxHP)) / maxHP * 100
    : 0;
  const woundedPenalty = Math.max(0, Math.min(10, Math.round(10 - normalizedHp / 10)));
  return baseCS - woundedPenalty;
}

export const FIRST_STRIKE_COMBAT_BONUS = 5;

type UnitAbilityContext = {
  readonly id: string;
  readonly typeId: string;
  readonly owner: string;
  readonly position: HexCoord;
};

export function hasUnitAbility(state: GameState, unit: UnitAbilityContext, abilityId: string): boolean {
  if (state.config.units.get(unit.typeId)?.abilities.includes(abilityId)) return true;
  return hasCommanderGrantedAbility(state, unit, abilityId);
}

export function calculateFirstStrikeCombatBonus(
  state: GameState,
  unit: UnitAbilityContext & { readonly health: number },
  isAttacking: boolean,
): number {
  return isAttacking && unit.health === 100 && hasUnitAbility(state, unit, 'first_strike')
    ? FIRST_STRIKE_COMBAT_BONUS
    : 0;
}

export const COMBAT_DAMAGE_BASE = 30;
export const COMBAT_DAMAGE_RANDOM_MIN = 0.7;
export const COMBAT_DAMAGE_RANDOM_MAX = 1.3;
export const COMBAT_DAMAGE_EXPONENT = Math.log(100 / COMBAT_DAMAGE_BASE) / 30;

export function combatDamageMultiplier(randomRoll: number): number {
  return COMBAT_DAMAGE_RANDOM_MIN + randomRoll * (COMBAT_DAMAGE_RANDOM_MAX - COMBAT_DAMAGE_RANDOM_MIN);
}

export function computeCombatDamage(strengthDifference: number, multiplier: number): number {
  return Math.round(COMBAT_DAMAGE_BASE * Math.exp(COMBAT_DAMAGE_EXPONENT * strengthDifference) * multiplier);
}

export function computeCombatDamageFromRoll(strengthDifference: number, randomRoll: number): number {
  return computeCombatDamage(strengthDifference, combatDamageMultiplier(randomRoll));
}

export const FLANKING_TECH_ID = 'military_training';
export const FLANKING_FRONT_SIDE_BONUS = 2;
export const FLANKING_REAR_SIDE_BONUS = 3;
export const FLANKING_DIRECT_REAR_BONUS = 5;

type HexDirection = NonNullable<UnitState['facing']>;

const HEX_DIRECTIONS: ReadonlyArray<HexCoord> = [
  { q: 1, r: 0 },   // 0 E
  { q: 1, r: -1 },  // 1 NE
  { q: 0, r: -1 },  // 2 NW
  { q: -1, r: 0 },  // 3 W
  { q: -1, r: 1 },  // 4 SW
  { q: 0, r: 1 },   // 5 SE
];

function isFlankingCombatant(state: GameState, unit: UnitState): boolean {
  if (unit.health <= 0) return false;
  const category = state.config.units.get(unit.typeId)?.category;
  return category === 'melee' || category === 'cavalry';
}

function findUnitAtPosition(state: GameState, position: HexCoord): UnitState | undefined {
  for (const unit of state.units.values()) {
    if (unit.position.q === position.q && unit.position.r === position.r) return unit;
  }
  return undefined;
}

export function hexDirectionIndex(from: HexCoord, to: HexCoord): number {
  const dq = to.q - from.q;
  const dr = to.r - from.r;
  return HEX_DIRECTIONS.findIndex(direction => direction.q === dq && direction.r === dr);
}

export function hexDirectionTarget(from: HexCoord, direction: HexDirection): HexCoord {
  const offset = HEX_DIRECTIONS[direction];
  return { q: from.q + offset.q, r: from.r + offset.r };
}

export function calculateBattlefrontFlankingBonus(
  state: GameState,
  attacker: UnitState,
  defenderPosition: HexCoord,
): number {
  if (!isFlankingCombatant(state, attacker)) return 0;
  const attackerPlayer = state.players.get(attacker.owner);
  if (!attackerPlayer?.researchedTechs.includes(FLANKING_TECH_ID)) return 0;

  const defender = findUnitAtPosition(state, defenderPosition);
  if (!defender || defender.facing === undefined) return 0;

  const anchorPosition = hexDirectionTarget(defender.position, defender.facing);
  const anchor = findUnitAtPosition(state, anchorPosition);
  if (!anchor || anchor.id === attacker.id || anchor.owner !== attacker.owner || !isFlankingCombatant(state, anchor)) {
    return 0;
  }

  const attackDirection = hexDirectionIndex(defender.position, attacker.position);
  if (attackDirection === -1) return 0;

  const relativeDirection = (attackDirection - defender.facing + 6) % 6;
  if (relativeDirection === 1 || relativeDirection === 5) return FLANKING_FRONT_SIDE_BONUS;
  if (relativeDirection === 2 || relativeDirection === 4) return FLANKING_REAR_SIDE_BONUS;
  if (relativeDirection === 3) return FLANKING_DIRECT_REAR_BONUS;
  return 0;
}

/**
 * Unit categories that count as "military" for combat analytics.
 * Civilian and religious units are excluded from strength/health snapshots.
 */
const MILITARY_CATEGORIES: ReadonlySet<UnitCategory> = new Set<UnitCategory>([
  'melee',
  'ranged',
  'siege',
  'cavalry',
  'naval',
]);

/**
 * Returns true when the given unit (identified by its typeId) belongs to
 * a military category. A missing UnitDef is treated as non-military.
 */
function isMilitaryUnit(state: GameState, typeId: string): boolean {
  const def = state.config.units.get(typeId);
  if (!def) return false;
  return MILITARY_CATEGORIES.has(def.category);
}

/**
 * Returns the mean `health` (0–100) across the player's owned military units,
 * excluding civilians and religious units. Returns 100 when the player has
 * no military units (a healthy empire by default).
 */
export function averageUnitHealth(state: GameState, playerId: PlayerId): number {
  let total = 0;
  let count = 0;
  for (const unit of state.units.values()) {
    if (unit.owner !== playerId) continue;
    if (!isMilitaryUnit(state, unit.typeId)) continue;
    total += unit.health;
    count += 1;
  }
  if (count === 0) return 100;
  return total / count;
}

/**
 * Returns the fraction (0–1) of the player's military units with
 * `fortified === true`. Returns 0 when the player has no military units.
 */
export function fortifiedRatio(state: GameState, playerId: PlayerId): number {
  let fortified = 0;
  let count = 0;
  for (const unit of state.units.values()) {
    if (unit.owner !== playerId) continue;
    if (!isMilitaryUnit(state, unit.typeId)) continue;
    if (unit.fortified) fortified += 1;
    count += 1;
  }
  if (count === 0) return 0;
  return fortified / count;
}

/**
 * Returns the number of military units owned by the player.
 * Military categories: melee, ranged, siege, cavalry, naval.
 */
export function militaryUnitCount(state: GameState, playerId: PlayerId): number {
  let count = 0;
  for (const unit of state.units.values()) {
    if (unit.owner !== playerId) continue;
    if (!isMilitaryUnit(state, unit.typeId)) continue;
    count += 1;
  }
  return count;
}

/**
 * Returns the player's aggregate combat strength: the sum of
 * effective combat strength across all owned military units.
 * Units without a registered UnitDef or with `combat === 0` are skipped.
 */
export function totalCombatStrength(state: GameState, playerId: PlayerId): number {
  let total = 0;
  for (const unit of state.units.values()) {
    if (unit.owner !== playerId) continue;
    const def = state.config.units.get(unit.typeId);
    if (!def) continue;
    if (!MILITARY_CATEGORIES.has(def.category)) continue;
    if (def.combat === 0) continue;
    total += computeEffectiveCS(def.combat, unit.health);
  }
  return total;
}

/**
 * Returns the mean `defenseHP` across the player's owned cities.
 * Returns 0 when the player has no cities.
 */
export function averageCityDefense(state: GameState, playerId: PlayerId): number {
  let total = 0;
  let count = 0;
  for (const city of state.cities.values()) {
    if (city.owner !== playerId) continue;
    total += city.defenseHP;
    count += 1;
  }
  if (count === 0) return 0;
  return total / count;
}

/**
 * Ranks every player in the game by `totalCombatStrength`, descending.
 * Ties share a rank (dense ranking: ranks are 1, 2, 2, 3 — not 1, 2, 2, 4).
 */
export function combatStrengthRanking(
  state: GameState,
): ReadonlyArray<{ readonly playerId: PlayerId; readonly strength: number; readonly rank: number }> {
  const entries: Array<{ playerId: PlayerId; strength: number }> = [];
  for (const playerId of state.players.keys()) {
    entries.push({ playerId, strength: totalCombatStrength(state, playerId) });
  }
  entries.sort((a, b) => b.strength - a.strength);

  const ranked: Array<{ readonly playerId: PlayerId; readonly strength: number; readonly rank: number }> = [];
  let lastStrength = Number.POSITIVE_INFINITY;
  let currentRank = 0;
  for (const entry of entries) {
    if (entry.strength !== lastStrength) {
      currentRank += 1;
      lastStrength = entry.strength;
    }
    ranked.push({ playerId: entry.playerId, strength: entry.strength, rank: currentRank });
  }
  return ranked;
}
