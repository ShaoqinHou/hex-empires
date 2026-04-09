import type { GameState, GameAction } from '../types/GameState';
import { calculateCityYields } from '../state/YieldCalculator';

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

// Re-export calculateCityYields from shared utility for backward compatibility
export { calculateCityYields } from '../state/YieldCalculator';
