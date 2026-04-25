import type { YieldSet } from './Yields';

/**
 * F-12: Tightened TerrainId — literal union of all terrain ids defined in
 * packages/engine/src/data/terrains/base-terrains.ts.
 * Any new terrain data file must add its id here.
 */
export type TerrainId =
  | 'grassland'
  | 'plains'
  | 'desert'
  | 'tundra'
  | 'snow'
  | 'coast'
  | 'ocean'
  | 'tropical'
  | 'rainforest'
  | 'mangrove'
  | 'navigable_river'
  | 'deep_ocean'
  | 'lake';

/**
 * W4-02: Biome classification for compound terrain model.
 * Replaces the Civ VI per-tile type approach with a biome × modifier
 * compound that matches the Civ VII design direction.
 */
export type Biome = 'desert' | 'grassland' | 'plains' | 'tropical' | 'tundra' | 'marine';

/**
 * W4-02: Terrain modifier indicating the texture/property overlay on a biome.
 * - flat: open, unobstructed
 * - rough: hills or rocky ground
 * - vegetated: forest, jungle, or rainforest cover
 * - wet: marsh, swamp, or wetland
 */
export type TerrainModifier = 'flat' | 'rough' | 'vegetated' | 'wet';

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
  /**
   * W4-02: Biome classification for the compound terrain model.
   * Optional so existing terrain data files continue to work unchanged.
   */
  readonly biome?: Biome;
  /**
   * W4-02: Modifier indicating the terrain texture/property overlay.
   * Optional so existing terrain data files continue to work unchanged.
   */
  readonly modifier?: TerrainModifier;
  /**
   * W4-05 (Deep Ocean): When true, entering this terrain requires Cartography
   * tech or Shipbuilding mastery. Without the tech, movement is blocked entirely;
   * with Cartography but without mastery, HP attrition applies each turn.
   */
  readonly isDeepOcean?: boolean;
}

export type FeatureId = string;

/** Terrain feature overlaid on base terrain (forest, hills, etc.) */
export interface TerrainFeatureDef {
  readonly id: FeatureId;
  readonly name: string;
  readonly movementCostModifier: number;   // added to base terrain cost
  readonly defenseBonusModifier: number;   // multiplicative defense bonus (e.g. 0.25 = +25%)
  readonly flatDefenseBonus?: number;      // flat +CS defender bonus (rulebook §6.4 rough/vegetated terrain)
  readonly depletesMovement?: boolean;     // true = entering this feature consumes ALL remaining MP (binary movement, §6.3)
  readonly yieldModifiers: Partial<YieldSet>;
  readonly blocksMovement: boolean;        // e.g., mountains
  readonly color: string;                  // rendering overlay color
  /**
   * W4-02: Biome modifier for compound terrain model annotation.
   * Optional so existing feature data files continue to work unchanged.
   */
  readonly modifier?: TerrainModifier;
}
