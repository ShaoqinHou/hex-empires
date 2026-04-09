import type { GameState, CityState } from '../types/GameState';
import type { YieldSet } from '../types/Yields';
import { addYields, EMPTY_YIELDS } from '../types/Yields';

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

    // Resource yield bonus
    if (tile.resource) {
      const resourceDef = state.config.resources.get(tile.resource);
      if (resourceDef) {
        total = addYields(total, resourceDef.yieldBonus);
      }
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
