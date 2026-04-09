import type { GameState, GameAction, CityState, PlayerState } from '../types/GameState';
import type { YieldSet } from '../types/Yields';
import { addYields, EMPTY_YIELDS } from '../types/Yields';
import { coordToKey } from '../hex/HexMath';

/**
 * GrowthSystem processes city growth on END_TURN.
 * Each city:
 * 1. Calculates food yield from territory
 * 2. Subtracts food consumed by population (2 food per pop)
 * 3. Surplus food accumulates toward next population
 * 4. At threshold, population grows
 */
export function growthSystem(state: GameState, action: GameAction): GameState {
  if (action.type !== 'END_TURN') return state;

  const updatedCities = new Map(state.cities);
  let changed = false;

  for (const [cityId, city] of state.cities) {
    if (city.owner !== state.currentPlayerId) continue;

    const yields = calculateCityYields(city, state);
    const foodConsumed = city.population * 2;
    const foodSurplus = yields.food - foodConsumed;
    const newFood = Math.max(0, city.food + foodSurplus);
    const growthThreshold = getGrowthThreshold(city.population);

    if (newFood >= growthThreshold && city.population < city.housing) {
      // Population grows
      updatedCities.set(cityId, {
        ...city,
        population: city.population + 1,
        food: newFood - growthThreshold,
      });
      changed = true;
    } else if (newFood !== city.food) {
      updatedCities.set(cityId, { ...city, food: newFood });
      changed = true;
    }
  }

  if (!changed) return state;
  return { ...state, cities: updatedCities };
}

/** Food needed for next population point */
export function getGrowthThreshold(population: number): number {
  // Civ-style formula: grows with each pop
  return 15 + 8 * population;
}

/** Calculate total yields for a city from its territory tiles */
export function calculateCityYields(city: CityState, state: GameState): YieldSet {
  let total = { ...EMPTY_YIELDS };

  for (const hexKey of city.territory) {
    const tile = state.map.tiles.get(hexKey);
    if (!tile) continue;

    // Base terrain yields
    const terrainYields = getTerrainYields(tile.terrain);
    total = addYields(total, terrainYields);

    // Feature yield modifiers
    if (tile.feature) {
      const featureYields = getFeatureYieldModifiers(tile.feature);
      total = addYields(total, featureYields);
    }

    // River bonus
    if (tile.river.length > 0) {
      total = addYields(total, { gold: 1 });
    }
  }

  // City center always produces at least 2 food, 1 production
  total = addYields(total, { food: 2, production: 1 });

  return total;
}

function getTerrainYields(terrain: string): Partial<YieldSet> {
  const table: Record<string, Partial<YieldSet>> = {
    grassland: { food: 2 },
    plains: { food: 1, production: 1 },
    desert: {},
    tundra: { food: 1 },
    snow: {},
    coast: { food: 1, gold: 1 },
    ocean: { food: 1 },
  };
  return table[terrain] ?? {};
}

function getFeatureYieldModifiers(feature: string): Partial<YieldSet> {
  const table: Record<string, Partial<YieldSet>> = {
    hills: { production: 1 },
    forest: { production: 1 },
    jungle: { food: 1 },
    marsh: { food: 1 },
    floodplains: { food: 3 },
    oasis: { food: 3, gold: 1 },
    reef: { food: 1, production: 1 },
  };
  return table[feature] ?? {};
}
