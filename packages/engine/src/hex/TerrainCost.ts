import type { HexTile } from '../types/GameState';

/** Get movement cost to enter a tile. Returns null if impassable. */
export function getMovementCost(tile: HexTile): number | null {
  // Base terrain costs — using hardcoded values for now
  // Will be replaced by registry lookups
  const terrainCosts: Record<string, number | null> = {
    grassland: 1,
    plains: 1,
    desert: 1,
    tundra: 1,
    snow: 1,
    coast: null, // impassable for land units
    ocean: null,
  };

  const featureCosts: Record<string, number | null> = {
    hills: 1,      // +1 movement cost
    mountains: null, // impassable
    forest: 1,     // +1 movement cost
    jungle: 1,     // +1 movement cost
    marsh: 1,      // +1 movement cost
    floodplains: 0,
    oasis: 0,
    reef: 0,
  };

  const baseCost = terrainCosts[tile.terrain];
  if (baseCost === null || baseCost === undefined) return null;

  if (tile.feature) {
    const featureCost = featureCosts[tile.feature];
    if (featureCost === null) return null; // impassable feature
    return baseCost + (featureCost ?? 0);
  }

  return baseCost;
}
