import type { GameState, GameAction, CityState } from '../types/GameState';
import { calculateCityYields } from '../state/YieldCalculator';
import { coordToKey } from '../hex/HexMath';

/** Number of free settlements before happiness penalty applies (Civ VII: 4) */
const FREE_SETTLEMENT_CAP = 4;
/** Happiness penalty per settlement above the cap (Civ VII: -5 per overage per settlement) */
const SETTLEMENT_CAP_PENALTY = 5;

/**
 * Calculate the effective settlement cap for a player.
 * Base cap is 4. Ages grant additional capacity:
 *   - Exploration age: +1 (total 5)
 *   - Modern age: +2 (total 6)
 * Additional cap increases can come from tech effects in the future.
 */
export function calculateEffectiveSettlementCap(state: GameState, playerId: string): number {
  const player = state.players.get(playerId);
  if (!player) return FREE_SETTLEMENT_CAP;

  let cap = FREE_SETTLEMENT_CAP;

  // Age-based bonuses: each age transition expands the cap
  if (player.age === 'exploration') {
    cap += 1;
  } else if (player.age === 'modern') {
    cap += 2;
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

/** Threshold (excess happiness) required to trigger the Nth celebration (1-indexed). */
const CELEBRATION_BASE_THRESHOLD = 50;
/** Production bonus percent awarded per active celebration. */
const CELEBRATION_BONUS_PERCENT = 10;
/** Number of turns a celebration bonus lasts. */
const CELEBRATION_DURATION_TURNS = 10;

/**
 * Calculate the next celebration threshold for a player.
 * First celebration: 50. Each subsequent: 50 * (celebrationCount + 1).
 * Capped at the 8th multiplier (celebrationCount 7): threshold stops increasing after 7th celebration.
 */
export function nextCelebrationThreshold(celebrationCount: number): number {
  return CELEBRATION_BASE_THRESHOLD * Math.min(celebrationCount + 1, 8);
}

/**
 * ResourceSystem accumulates per-turn yields (gold, science, culture, faith)
 * from all cities at END_TURN. Also updates city happiness and applies
 * happiness penalties to yields. Towns convert production to gold.
 *
 * Celebration mechanic: sum excess happiness (positive happiness only) across
 * all cities. When it meets or exceeds the threshold, a celebration is triggered:
 * +10% production bonus for 10 turns. Bonus is removed when celebrationTurnsLeft
 * reaches 0. The threshold increases with each celebration earned.
 */
export function resourceSystem(state: GameState, action: GameAction): GameState {
  if (action.type !== 'END_TURN') return state;

  const updatedPlayers = new Map(state.players);
  const updatedCities = new Map(state.cities);
  let changed = false;

  for (const [playerId, player] of state.players) {
    if (playerId !== state.currentPlayerId) continue;

    const settlementCapPenalty = calculateSettlementCapPenalty(state, playerId);

    let totalGold = 0;
    let totalScience = 0;
    let totalCulture = 0;
    let totalFaith = 0;
    let cityCount = 0;
    let totalExcessHappiness = 0;

    for (const city of state.cities.values()) {
      if (city.owner !== playerId) continue;
      cityCount++;
      const yields = calculateCityYields(city, state);

      // Update happiness for this city
      const cityHappiness = calculateCityHappiness(city, state) - settlementCapPenalty;
      if (cityHappiness !== city.happiness) {
        updatedCities.set(city.id, { ...city, happiness: cityHappiness });
      }

      // Accumulate excess happiness (only positive values contribute to celebrations)
      if (cityHappiness > 0) {
        totalExcessHappiness += cityHappiness;
      }

      // Towns convert all production to gold
      let goldFromCity = yields.gold;
      let scienceFromCity = yields.science;
      let cultureFromCity = yields.culture;
      let faithFromCity = yields.faith;

      if (city.settlementType === 'town') {
        goldFromCity += yields.production; // production -> gold conversion
      }

      // Apply happiness penalty to yields
      goldFromCity = applyHappinessPenalty(goldFromCity, cityHappiness);
      scienceFromCity = applyHappinessPenalty(scienceFromCity, cityHappiness);
      cultureFromCity = applyHappinessPenalty(cultureFromCity, cityHappiness);
      faithFromCity = applyHappinessPenalty(faithFromCity, cityHappiness);

      totalGold += goldFromCity;
      totalScience += scienceFromCity;
      totalCulture += cultureFromCity;
      totalFaith += faithFromCity;
    }

    // Endeavor bonuses: +2 gold and +2 science per active endeavor involving this player
    // Both the initiator and the target benefit from active endeavors.
    let endeavorGold = 0;
    let endeavorScience = 0;
    for (const [key, rel] of state.diplomacy.relations) {
      if (!key.includes(playerId)) continue;
      endeavorGold += rel.activeEndeavors.length * 2;
      endeavorScience += rel.activeEndeavors.length * 2;
    }
    totalGold += endeavorGold;
    totalScience += endeavorScience;

    // Sanction penalties: -3 gold per active sanction whose targetId is this player
    let sanctionGoldPenalty = 0;
    for (const [key, rel] of state.diplomacy.relations) {
      if (!key.includes(playerId)) continue;
      for (const sanction of rel.activeSanctions) {
        if (sanction.targetId === playerId) {
          sanctionGoldPenalty += 3;
        }
      }
    }
    totalGold -= sanctionGoldPenalty;

    // Calculate influence: +1 per city, +2 per alliance
    let totalInfluence = cityCount;
    for (const [key, rel] of state.diplomacy.relations) {
      if (key.includes(playerId) && rel.hasAlliance) {
        totalInfluence += 2;
      }
    }

    // Unit maintenance (1 gold per military unit)
    let maintenance = 0;
    for (const unit of state.units.values()) {
      if (unit.owner === playerId) {
        const isCivilian = state.config.units.get(unit.typeId)?.category === 'civilian';
        if (!isCivilian) maintenance += 1;
      }
    }

    const netGold = totalGold - maintenance;

    // --- Celebration mechanic ---
    let { celebrationCount, celebrationBonus, celebrationTurnsLeft } = player;

    // Decrement celebration timer first
    if (celebrationTurnsLeft > 0) {
      celebrationTurnsLeft -= 1;
      if (celebrationTurnsLeft === 0) {
        celebrationBonus = 0;
      }
    }

    // Check if excess happiness meets the next celebration threshold
    const threshold = nextCelebrationThreshold(celebrationCount);
    if (totalExcessHappiness >= threshold) {
      celebrationCount += 1;
      celebrationBonus = CELEBRATION_BONUS_PERCENT;
      celebrationTurnsLeft = CELEBRATION_DURATION_TURNS;
    }

    updatedPlayers.set(playerId, {
      ...player,
      gold: player.gold + netGold,
      science: player.science + totalScience,
      culture: player.culture + totalCulture,
      faith: player.faith + totalFaith,
      influence: player.influence + totalInfluence,
      totalGoldEarned: player.totalGoldEarned + Math.max(0, netGold),
      celebrationCount,
      celebrationBonus,
      celebrationTurnsLeft,
    });
    changed = true;
  }

  if (!changed) return state;
  return { ...state, players: updatedPlayers, cities: updatedCities };
}
