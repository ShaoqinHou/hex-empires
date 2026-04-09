import type { GameState, GameAction, CityState } from '../types/GameState';
import { calculateCityYields } from '../state/YieldCalculator';
import { coordToKey, neighbors, keyToCoord } from '../hex/HexMath';

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
      // Population grows + territory expands
      const expandedTerritory = expandBorders(city, state, updatedCities);
      updatedCities.set(cityId, {
        ...city,
        population: city.population + 1,
        food: newFood - growthThreshold,
        territory: expandedTerritory,
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
