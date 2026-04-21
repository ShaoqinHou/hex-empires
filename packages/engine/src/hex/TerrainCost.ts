import type { HexTile } from '../types/GameState';
import type { GameConfig } from '../types/GameConfig';

/**
 * Movement cost result — includes whether entering this tile depletes all
 * remaining movement points (binary deplete-all mechanic, §6.3).
 */
export interface MovementCostResult {
  readonly cost: number;
  readonly deplete: boolean;
}

/**
 * Get movement cost to enter a tile. Returns null if impassable.
 * When config is provided, uses data-driven terrain/feature definitions.
 * When not provided, falls back to hardcoded table for backward compatibility.
 */
export function getMovementCost(tile: HexTile, config?: GameConfig): MovementCostResult | null {
  if (config) {
    return getMovementCostFromConfig(tile, config);
  }
  return getMovementCostHardcoded(tile);
}

function getMovementCostFromConfig(tile: HexTile, config: GameConfig): MovementCostResult | null {
  const terrainDef = config.terrains.get(tile.terrain);
  if (!terrainDef || !terrainDef.isPassable) return null;

  const baseCost = terrainDef.movementCost;

  if (tile.feature) {
    const featureDef = config.features.get(tile.feature);
    if (featureDef?.blocksMovement) return null; // impassable feature
    return {
      cost: baseCost + (featureDef?.movementCostModifier ?? 0),
      deplete: featureDef?.depletesMovement ?? false,
    };
  }

  return { cost: baseCost, deplete: false };
}

/** Hardcoded fallback when config is not available */
function getMovementCostHardcoded(tile: HexTile): MovementCostResult | null {
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

  // F-03: features with deplete=true consume ALL remaining movement
  const featureCosts: Record<string, MovementCostResult | null> = {
    hills: { cost: 1, deplete: true },
    mountains: null,             // impassable
    forest: { cost: 1, deplete: true },
    jungle: { cost: 1, deplete: true },
    marsh: { cost: 1, deplete: true },
    floodplains: { cost: 0, deplete: false },
    oasis: { cost: 0, deplete: false },
    reef: { cost: 0, deplete: false },
  };

  const baseCost = terrainCosts[tile.terrain];
  if (baseCost === null || baseCost === undefined) return null;

  if (tile.feature) {
    const featureResult = featureCosts[tile.feature];
    if (featureResult === null) return null; // impassable feature
    if (featureResult === undefined) return { cost: baseCost, deplete: false };
    return {
      cost: baseCost + featureResult.cost,
      deplete: featureResult.deplete,
    };
  }

  return { cost: baseCost, deplete: false };
}
