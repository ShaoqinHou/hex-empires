import type { GameState, GameAction, CityState, Age, TownSpecialization } from '../types/GameState';
import { calculateCityYields } from '../state/YieldCalculator';
import { coordToKey, neighbors, keyToCoord } from '../hex/HexMath';

/** Minimum population required to assign a town specialization */
const SPECIALIZATION_POP_MINIMUM = 7;

/**
 * Attempt to assign a specialization to a town.
 * Constraints:
 * - Settlement must be a town (not a city)
 * - Population must be >= 7
 * - Specialization cannot be changed once set
 */
function handleSetSpecialization(
  state: GameState,
  cityId: string,
  specialization: TownSpecialization,
): GameState {
  const city = state.cities.get(cityId);
  if (!city) return state;
  if (city.owner !== state.currentPlayerId) return state;
  if (city.settlementType !== 'town') return state;
  if (city.population < SPECIALIZATION_POP_MINIMUM) return state;
  if (city.specialization !== null) return state; // already specialized

  // fort_town grants +5 defense HP immediately on specialization
  const defenseHP = specialization === 'fort_town' ? city.defenseHP + 5 : city.defenseHP;
  const updatedCity: CityState = { ...city, specialization, defenseHP };
  const updatedCities = new Map(state.cities);
  updatedCities.set(cityId, updatedCity);
  return { ...state, cities: updatedCities };
}

/**
 * GrowthSystem processes city growth on END_TURN.
 * Each city:
 * 1. Calculates food yield from territory
 * 2. Subtracts food consumed by population (2 food per pop)
 * 3. Surplus food accumulates toward next population
 * 4. At threshold, population grows
 *
 * Growth threshold is age-dependent (Civ VII-style):
 * - Antiquity: 30 + 3*g + g^3.3 (fast early growth)
 * - Exploration: 20 + 20*g + g^3.0 (moderate growth)
 * - Modern: 20 + 40*g + g^2.7 (slow late growth)
 * where g = growthEvents = population - 1
 */
export function growthSystem(state: GameState, action: GameAction): GameState {
  if (action.type === 'SET_SPECIALIZATION') {
    return handleSetSpecialization(state, action.cityId, action.specialization);
  }
  if (action.type !== 'END_TURN') return state;

  const updatedCities = new Map(state.cities);
  let changed = false;

  for (const [cityId, city] of state.cities) {
    if (city.owner !== state.currentPlayerId) continue;

    // Determine the player's current age for growth formula
    const player = state.players.get(city.owner);
    const age: Age = player?.age ?? state.age.currentAge;

    const yields = calculateCityYields(city, state);
    const foodConsumed = city.population * 2;
    const foodSurplus = yields.food - foodConsumed;
    const newFood = city.food + foodSurplus;
    const baseThreshold = getGrowthThreshold(city.population, age);
    const totalGrowthRate = calculateTotalGrowthRate(city, state);
    let growthThreshold = Math.max(1, Math.round(baseThreshold * (1 - totalGrowthRate)));
    // growing_town specialization: +50% growth rate = -33% threshold
    if (city.specialization === 'growing_town') {
      growthThreshold = Math.round(growthThreshold / 1.5);
    }

    if (newFood < 0 && city.population > 1) {
      // Starvation — lose population
      updatedCities.set(cityId, { ...city, population: city.population - 1, food: 0 });
      changed = true;
    } else {
      const clampedFood = Math.max(0, newFood);
      // Towns soft-cap at 5 pop; cities grow as long as happiness >= 0
      const townCap = city.settlementType === 'town' ? 5 : Infinity;
      const canGrow = city.happiness >= 0 && city.population < townCap;
      if (clampedFood >= growthThreshold && canGrow) {
        // Population grows + territory expands
        const expandedTerritory = expandBorders(city, state, updatedCities);
        updatedCities.set(cityId, {
          ...city,
          population: city.population + 1,
          food: clampedFood - growthThreshold,
          territory: expandedTerritory,
        });
        changed = true;
      } else if (clampedFood !== city.food) {
        updatedCities.set(cityId, { ...city, food: clampedFood });
        changed = true;
      }
    }
  }

  if (!changed) return state;
  return { ...state, cities: updatedCities };
}

/**
 * Calculate the total growth rate bonus for a city from its buildings.
 * Each building with a growthRateBonus contributes to the sum.
 * Example: Granary (0.1) + Watermill (0.05) = 0.15 → threshold × 0.85.
 */
export function calculateTotalGrowthRate(city: CityState, state: GameState): number {
  let total = 0;
  for (const buildingId of city.buildings) {
    const building = state.config.buildings.get(buildingId);
    if (building?.growthRateBonus) {
      total += building.growthRateBonus;
    }
  }
  return total;
}

/**
 * Food needed for next population point.
 * Uses Civ VII age-dependent formula:
 * - Antiquity: 30 + 3*g + g^3.3
 * - Exploration: 20 + 20*g + g^3.0
 * - Modern: 20 + 40*g + g^2.7
 * where g = growthEvents = population - 1.
 * Defaults to antiquity if age is not provided.
 */
/**
 * Civ VII post-patch (v1.2.0) quadratic growth formula:
 * Food Cost = Flat + (Scalar * X) + (Exponent * X^2)
 * where X = number of growth events (population - 1)
 */
export function getGrowthThreshold(population: number, age: Age = 'antiquity'): number {
  const x = Math.max(0, population - 1);

  switch (age) {
    case 'antiquity':
      return Math.round(30 + 3 * x + 33 * x * x);
    case 'exploration':
      return Math.round(20 + 20 * x + 30 * x * x);
    case 'modern':
      return Math.round(20 + 40 * x + 27 * x * x);
    default:
      return Math.round(30 + 3 * x + 33 * x * x);
  }
}

/** Expand city borders by claiming one adjacent unclaimed tile */
function expandBorders(
  city: CityState,
  state: GameState,
  updatedCities: Map<string, CityState>,
): ReadonlyArray<string> {
  const territory = [...city.territory];

  // Find all hexes adjacent to current territory that aren't claimed
  const claimed = new Set<string>();
  for (const c of updatedCities.values()) {
    for (const t of c.territory) claimed.add(t);
  }
  // Also check original cities for claimed tiles
  for (const c of state.cities.values()) {
    for (const t of c.territory) claimed.add(t);
  }

  let bestTile: string | null = null;
  let bestYield = -1;

  for (const hexKey of territory) {
    const coord = keyToCoord(hexKey);
    for (const neighbor of neighbors(coord)) {
      const nKey = coordToKey(neighbor);
      if (claimed.has(nKey)) continue;
      if (territory.includes(nKey)) continue;
      const tile = state.map.tiles.get(nKey);
      if (!tile) continue;
      const terrain = state.config.terrains.get(tile.terrain);
      if (!terrain || terrain.isWater) continue;

      // Score by total yields
      const yieldScore = terrain.baseYields.food + terrain.baseYields.production + terrain.baseYields.gold;
      if (yieldScore > bestYield) {
        bestYield = yieldScore;
        bestTile = nKey;
      }
    }
  }

  if (bestTile) {
    territory.push(bestTile);
  }

  return territory;
}

// Re-export calculateCityYields from shared utility for backward compatibility
export { calculateCityYields } from '../state/YieldCalculator';
