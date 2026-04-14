import type { YieldSet } from './Yields';

export type TerrainId = string;

/** Base terrain type (the underlying land/water type) */
export interface TerrainDef {
  readonly id: TerrainId;
  readonly name: string;
  readonly movementCost: number; // movement points to enter
  readonly defenseBonus: number; // combat defense modifier (0.0 = none, 0.25 = +25%)
  readonly baseYields: YieldSet;
  readonly isPassable: boolean;  // can land units enter?
  readonly isWater: boolean;     // ocean/coast
  readonly color: string;        // hex color for rendering
}

export type FeatureId = string;

/** Terrain feature overlaid on base terrain (forest, hills, etc.) */
export interface TerrainFeatureDef {
  readonly id: FeatureId;
  readonly name: string;
  readonly movementCostModifier: number;   // added to base terrain cost
  readonly defenseBonusModifier: number;   // multiplicative defense bonus (e.g. 0.25 = +25%)
  readonly flatDefenseBonus?: number;      // flat +CS defender bonus (rulebook §6.4 rough/vegetated terrain)
  readonly yieldModifiers: Partial<YieldSet>;
  readonly blocksMovement: boolean;        // e.g., mountains
  readonly color: string;                  // rendering overlay color
}
