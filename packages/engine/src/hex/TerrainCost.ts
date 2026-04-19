import type { HexTile } from '../types/GameState';
import type { GameConfig } from '../types/GameConfig';

/**
 * Get movement cost to enter a tile. Returns null if impassable.
 * When config is provided, uses data-driven terrain/feature definitions.
 * When not provided, falls back to hardcoded table for backward compatibility.
 */
export function getMovementCost(tile: HexTile, config?: GameConfig): number | null {
  if (config) {
    return getMovementCostFromConfig(tile, config);
  }
  return getMovementCostHardcoded(tile);
}

function getMovementCostFromConfig(tile: HexTile, config: GameConfig): number | null {
  const terrainDef = config.terrains.get(tile.terrain);
  if (!terrainDef || !terrainDef.isPassable) return null;

  const baseCost = terrainDef.movementCost;

  if (tile.feature) {
    const featureDef = config.features.get(tile.feature);
    if (featureDef?.blocksMovement) return null; // impassable feature
    return baseCost + (featureDef?.movementCostModifier ?? 0);
  }

  return baseCost;
}

/** Hardcoded fallback when config is not available */
function getMovementCostHardcoded(tile: HexTile): number | null {
  const terrainCosts: Record<string, number | null> = {
    grassland: 1,
    plains: 1,
    desert: 1,
    tundra: 1,
    snow: 1,
    coast: null, // impassable for land units
    ocean: null,
    // W4-02 terrain types
    tropical: 1,
    rainforest: 2,
    mangrove: 2,
    navigable_river: null, // impassable for land units; naval units use isWater=true
    deep_ocean: null,      // blocked for all by default; tech check in movementSystem
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
