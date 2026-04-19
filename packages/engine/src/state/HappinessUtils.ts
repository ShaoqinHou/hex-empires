import type { GameState, CityState } from '../types/GameState';
import { coordToKey } from '../hex/HexMath';

/** Number of free settlements before happiness penalty applies (Civ VII: 4) */
const FREE_SETTLEMENT_CAP = 4;
/** Happiness penalty per settlement above the cap (Civ VII: -5 per overage per settlement) */
const SETTLEMENT_CAP_PENALTY = 5;

/**
 * Calculate the effective settlement cap for a player.
 * Base cap is 4 (Antiquity). Ages grant additional capacity per VII parity:
 *   - Exploration age: +4 (total 8)
 *   - Modern age: +8 (total 12)
 * Additional cap increases can come from tech effects in the future.
 */
export function calculateEffectiveSettlementCap(state: GameState, playerId: string): number {
  const player = state.players.get(playerId);
  if (!player) return FREE_SETTLEMENT_CAP;

  let cap = FREE_SETTLEMENT_CAP;

  // Age-based bonuses: each age transition substantially expands the cap (VII parity)
  if (player.age === 'exploration') {
    cap += 4; // Antiquity 4 → Exploration 8
  } else if (player.age === 'modern') {
    cap += 8; // Antiquity 4 → Modern 12
  }

  return cap;
}

/**
 * Calculate happiness for a single city.
 * Base: +5 (town) or +10 (city)
 * -2 per population above 1
 * +1 per building with positive effects
 * Global settlement cap penalty applied separately
 */
export function calculateCityHappiness(city: CityState, state: GameState): number {
  const base = city.settlementType === 'city' ? 10 : 5;
  const popPenalty = Math.max(0, city.population - 1) * 2;

  // Building happiness: +1 per building with positive yields, minus each building's happinessCost
  let buildingBonus = 0;
  let buildingHappinessCost = 0;
  for (const buildingId of city.buildings) {
    const def = state.config.buildings.get(buildingId);
    if (def) {
      const hasPositiveYield = (def.yields.food ?? 0) > 0 || (def.yields.production ?? 0) > 0
        || (def.yields.gold ?? 0) > 0 || (def.yields.science ?? 0) > 0
        || (def.yields.culture ?? 0) > 0 || (def.yields.faith ?? 0) > 0;
      if (hasPositiveYield) buildingBonus += 1;
      buildingHappinessCost += def.happinessCost ?? 0;
    }
  }

  // Luxury resource happiness: each luxury tile in territory adds its happinessBonus
  let luxuryBonus = 0;
  for (const tileKey of city.territory) {
    const tile = state.map.tiles.get(tileKey);
    if (tile && tile.resource) {
      const resDef = state.config.resources.get(tile.resource);
      if (resDef && resDef.type === 'luxury') {
        luxuryBonus += resDef.happinessBonus;
      }
    }
  }

  // Fresh water bonus: +3 happiness if city center tile has rivers
  let freshWaterBonus = 0;
  const centerTile = state.map.tiles.get(coordToKey(city.position));
  if (centerTile && centerTile.river.length > 0) {
    freshWaterBonus = 3;
  }

  // War weariness: happiness penalty when at war with negative warSupport
  let warWearinessPenalty = 0;
  for (const [key, rel] of state.diplomacy.relations) {
    if (rel.status !== 'war') continue;
    if (!key.includes(city.owner)) continue;
    // warSupport < 0 means defender has advantage (we are losing)
    if (rel.warSupport < -30) {
      warWearinessPenalty = Math.max(warWearinessPenalty, 5);
    } else if (rel.warSupport < 0) {
      warWearinessPenalty = Math.max(warWearinessPenalty, 3);
    }
  }

  // Specialist unhappiness: each specialist costs -2 happiness (Civ VII rulebook)
  const specialistPenalty = city.specialists * 2;

  return base - popPenalty + buildingBonus - buildingHappinessCost + luxuryBonus + freshWaterBonus - warWearinessPenalty - specialistPenalty;
}

/**
 * Calculate the per-settlement happiness penalty for a player.
 * When over the cap, EACH settlement suffers -5 × excess happiness.
 * Excess is capped at 7 (max penalty -35 per settlement).
 * Returns the per-settlement penalty amount (applied to each city individually).
 * Uses the effective cap (base 4, scaling with age).
 */
export function calculateSettlementCapPenalty(state: GameState, playerId: string): number {
  let count = 0;
  for (const city of state.cities.values()) {
    if (city.owner === playerId) count++;
  }
  const effectiveCap = calculateEffectiveSettlementCap(state, playerId);
  const excess = Math.min(7, Math.max(0, count - effectiveCap));
  return excess * SETTLEMENT_CAP_PENALTY;
}

/**
 * Apply happiness penalty multiplier to yields.
 * Each negative happiness = -2% total yields, up to -50 happiness (100% reduction).
 */
export function applyHappinessPenalty(value: number, happiness: number): number {
  if (happiness >= 0) return value;
  const penaltyPct = Math.min(100, Math.abs(happiness) * 2);
  return Math.floor(value * (100 - penaltyPct) / 100);
}
