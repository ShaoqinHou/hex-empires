import type { GameState, CityState } from '../types/GameState';
import { calculateCityYields, getSpecializationYields } from './YieldCalculator';
import { calculateCityHappiness, calculateSettlementCapPenalty, applyHappinessPenalty } from '../systems/resourceSystem';
import { getGrowthThreshold } from '../systems/growthSystem';

/**
 * Per-turn resource change summary for a player
 */
export interface ResourceChangeSummary {
  /** Net gold income per turn (positive = income, negative = loss) */
  goldPerTurn: number;
  /** Science income per turn */
  sciencePerTurn: number;
  /** Culture income per turn */
  culturePerTurn: number;
  /** Faith income per turn */
  faithPerTurn: number;
  /** Influence income per turn */
  influencePerTurn: number;
  /** Unit maintenance cost */
  maintenanceCost: number;
  /** Cities at risk of starvation (negative food surplus) */
  starvingCities: Array<{ cityId: string; cityName: string; foodDeficit: number }>;
  /** Cities with gold deficit (towns with no production) */
  goldDeficitCities: Array<{ cityId: string; cityName: string; deficit: number }>;
  /** Total food surplus across all cities */
  totalFoodSurplus: number;
  /** Total production across all cities */
  totalProduction: number;
  /** Number of cities with negative happiness */
  unhappyCities: number;
}

/**
 * Calculate per-turn resource changes for a player.
 * This is the same logic as resourceSystem but returns a summary
 * instead of modifying state, and includes additional info for UI display.
 */
export function calculateResourceChanges(state: GameState, playerId: string): ResourceChangeSummary {
  const player = state.players.get(playerId);
  if (!player) {
    return {
      goldPerTurn: 0,
      sciencePerTurn: 0,
      culturePerTurn: 0,
      faithPerTurn: 0,
      influencePerTurn: 0,
      maintenanceCost: 0,
      starvingCities: [],
      goldDeficitCities: [],
      totalFoodSurplus: 0,
      totalProduction: 0,
      unhappyCities: 0,
    };
  }

  const settlementCapPenalty = calculateSettlementCapPenalty(state, playerId);

  let totalGold = 0;
  let totalScience = 0;
  let totalCulture = 0;
  let totalFaith = 0;
  let totalFoodSurplus = 0;
  let totalProduction = 0;
  let cityCount = 0;
  let unhappyCities = 0;

  const starvingCities: ResourceChangeSummary['starvingCities'] = [];
  const goldDeficitCities: ResourceChangeSummary['goldDeficitCities'] = [];

  // Calculate yields from all cities
  for (const city of state.cities.values()) {
    if (city.owner !== playerId) continue;
    cityCount++;

    const yields = calculateCityYields(city, state);

    // Calculate happiness
    const cityHappiness = calculateCityHappiness(city, state) - settlementCapPenalty;
    if (cityHappiness < 0) unhappyCities++;

    // Food surplus check
    const foodConsumed = city.population * 2;
    const foodSurplus = applyHappinessPenalty(yields.food, cityHappiness) - foodConsumed;
    totalFoodSurplus += foodSurplus;

    const growthThreshold = getGrowthThreshold(city.population);
    if (foodSurplus < 0 && city.food < growthThreshold * 0.2) {
      // City is starving and has low food reserves
      starvingCities.push({
        cityId: city.id,
        cityName: city.name,
        foodDeficit: Math.abs(foodSurplus),
      });
    }

    // Towns convert production to gold
    let goldFromCity = yields.gold;
    let scienceFromCity = yields.science;
    let cultureFromCity = yields.culture;
    let faithFromCity = yields.faith;
    let productionFromCity = yields.production;

    if (city.settlementType === 'town') {
      goldFromCity += yields.production; // production -> gold conversion
      productionFromCity = 0; // towns don't accumulate production
    }

    // Apply happiness penalty
    goldFromCity = applyHappinessPenalty(goldFromCity, cityHappiness);
    scienceFromCity = applyHappinessPenalty(scienceFromCity, cityHappiness);
    cultureFromCity = applyHappinessPenalty(cultureFromCity, cityHappiness);
    faithFromCity = applyHappinessPenalty(faithFromCity, cityHappiness);

    totalGold += goldFromCity;
    totalScience += scienceFromCity;
    totalCulture += cultureFromCity;
    totalFaith += faithFromCity;
    totalProduction += productionFromCity;

    // Check for gold deficit (low gold cities)
    if (city.settlementType === 'town' && goldFromCity < 0) {
      goldDeficitCities.push({
        cityId: city.id,
        cityName: city.name,
        deficit: Math.abs(goldFromCity),
      });
    }
  }

  // Endeavor bonuses
  let endeavorGold = 0;
  let endeavorScience = 0;
  for (const [key, rel] of state.diplomacy.relations) {
    if (!key.includes(playerId)) continue;
    endeavorGold += rel.activeEndeavors.length * 2;
    endeavorScience += rel.activeEndeavors.length * 2;
  }
  totalGold += endeavorGold;
  totalScience += endeavorScience;

  // Sanction penalties
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

  // Influence: +1 per city, +2 per alliance
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

  return {
    goldPerTurn: netGold,
    sciencePerTurn: totalScience,
    culturePerTurn: totalCulture,
    faithPerTurn: totalFaith,
    influencePerTurn: totalInfluence,
    maintenanceCost: maintenance,
    starvingCities,
    goldDeficitCities,
    totalFoodSurplus,
    totalProduction,
    unhappyCities,
  };
}
