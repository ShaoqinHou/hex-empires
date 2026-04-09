import type { GameState, GameAction, CityState } from '../types/GameState';
import { calculateCityYields } from '../state/YieldCalculator';

/** Number of free settlements before happiness penalty applies */
const FREE_SETTLEMENT_CAP = 3;
/** Happiness penalty per settlement above the cap */
const SETTLEMENT_CAP_PENALTY = 3;

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

  // +1 happiness per building (buildings with positive effects)
  let buildingBonus = 0;
  for (const buildingId of city.buildings) {
    const def = state.config.buildings.get(buildingId);
    if (def) {
      const hasPositiveYield = (def.yields.food ?? 0) > 0 || (def.yields.production ?? 0) > 0
        || (def.yields.gold ?? 0) > 0 || (def.yields.science ?? 0) > 0
        || (def.yields.culture ?? 0) > 0 || (def.yields.faith ?? 0) > 0;
      if (hasPositiveYield) buildingBonus += 1;
    }
  }

  return base - popPenalty + buildingBonus;
}

/**
 * Calculate the global settlement cap penalty for a player.
 * Players get 3 free settlements; each beyond that costs -3 happiness globally.
 */
export function calculateSettlementCapPenalty(state: GameState, playerId: string): number {
  let count = 0;
  for (const city of state.cities.values()) {
    if (city.owner === playerId) count++;
  }
  const excess = Math.max(0, count - FREE_SETTLEMENT_CAP);
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

/**
 * ResourceSystem accumulates per-turn yields (gold, science, culture, faith)
 * from all cities at END_TURN. Also updates city happiness and applies
 * happiness penalties to yields. Towns convert production to gold.
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

    for (const city of state.cities.values()) {
      if (city.owner !== playerId) continue;
      const yields = calculateCityYields(city, state);

      // Update happiness for this city
      const cityHappiness = calculateCityHappiness(city, state) - settlementCapPenalty;
      if (cityHappiness !== city.happiness) {
        updatedCities.set(city.id, { ...city, happiness: cityHappiness });
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

    // Unit maintenance (1 gold per military unit)
    let maintenance = 0;
    for (const unit of state.units.values()) {
      if (unit.owner === playerId) {
        const isCivilian = state.config.units.get(unit.typeId)?.category === 'civilian';
        if (!isCivilian) maintenance += 1;
      }
    }

    const netGold = totalGold - maintenance;
    updatedPlayers.set(playerId, {
      ...player,
      gold: player.gold + netGold,
      science: player.science + totalScience,
      culture: player.culture + totalCulture,
      faith: player.faith + totalFaith,
      totalGoldEarned: player.totalGoldEarned + Math.max(0, netGold),
    });
    changed = true;
  }

  if (!changed) return state;
  return { ...state, players: updatedPlayers, cities: updatedCities };
}
