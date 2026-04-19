import type { TerrainDef } from '../../types/Terrain';

export const GRASSLAND: TerrainDef = {
  id: 'grassland',
  name: 'Grassland',
  movementCost: 1,
  defenseBonus: 0,
  baseYields: { food: 3, production: 0, gold: 0, science: 0, culture: 0, faith: 0, influence: 0, housing: 0, diplomacy: 0 },
  isPassable: true,
  isWater: false,
  color: '#5c9e4a',
  biome: 'grassland',
  modifier: 'flat',
} as const;

export const PLAINS: TerrainDef = {
  id: 'plains',
  name: 'Plains',
  movementCost: 1,
  defenseBonus: 0,
  baseYields: { food: 2, production: 1, gold: 0, science: 0, culture: 0, faith: 0, influence: 0, housing: 0, diplomacy: 0 },
  isPassable: true,
  isWater: false,
  color: '#a8b84e',
  biome: 'plains',
  modifier: 'flat',
} as const;

export const DESERT: TerrainDef = {
  id: 'desert',
  name: 'Desert',
  movementCost: 1,
  defenseBonus: 0,
  baseYields: { food: 2, production: 1, gold: 0, science: 0, culture: 0, faith: 0, influence: 0, housing: 0, diplomacy: 0 },
  isPassable: true,
  isWater: false,
  color: '#e8d48b',
  biome: 'desert',
  modifier: 'flat',
} as const;

export const TUNDRA: TerrainDef = {
  id: 'tundra',
  name: 'Tundra',
  movementCost: 1,
  defenseBonus: 0,
  baseYields: { food: 3, production: 0, gold: 0, science: 0, culture: 0, faith: 0, influence: 0, housing: 0, diplomacy: 0 },
  isPassable: true,
  isWater: false,
  color: '#9eb89a',
  biome: 'tundra',
  modifier: 'flat',
} as const;

/**
 * W4-02: SNOW is retained for backward compatibility with existing map data and
 * save files but is now represented as tundra biome with no special modifier.
 * New maps should prefer TUNDRA; SNOW will be phased out in a future refactor.
 *
 * @deprecated Use TUNDRA (biome:'tundra') for new map generation. SNOW is kept
 * only for existing data compatibility.
 */
export const SNOW: TerrainDef = {
  id: 'snow',
  name: 'Snow',
  movementCost: 1,
  defenseBonus: 0,
  baseYields: { food: 0, production: 0, gold: 0, science: 0, culture: 0, faith: 0, influence: 0, housing: 0, diplomacy: 0 },
  isPassable: true,
  isWater: false,
  color: '#e8f0f0',
  biome: 'tundra',
  modifier: 'flat',
} as const;

export const COAST: TerrainDef = {
  id: 'coast',
  name: 'Coast',
  movementCost: 1,
  defenseBonus: 0,
  baseYields: { food: 1, production: 0, gold: 1, science: 0, culture: 0, faith: 0, influence: 0, housing: 0, diplomacy: 0 },
  isPassable: false, // not passable by land units
  isWater: true,
  color: '#5ba8d4',
  biome: 'marine',
  modifier: 'flat',
} as const;

export const OCEAN: TerrainDef = {
  id: 'ocean',
  name: 'Ocean',
  movementCost: 1,
  defenseBonus: 0,
  baseYields: { food: 1, production: 0, gold: 0, science: 0, culture: 0, faith: 0, influence: 0, housing: 0, diplomacy: 0 },
  isPassable: false,
  isWater: true,
  color: '#3574a8',
  biome: 'marine',
  modifier: 'flat',
} as const;

// ── W4-02: Tropical Biome ────────────────────────────────────────────────────

/**
 * Tropical flat terrain — open tropical lowlands.
 * High food yield reflects the fertile equatorial environment.
 */
export const TROPICAL: TerrainDef = {
  id: 'tropical',
  name: 'Tropical',
  movementCost: 1,
  defenseBonus: 0,
  baseYields: { food: 3, production: 0, gold: 0, science: 0, culture: 0, faith: 0, influence: 0, housing: 0, diplomacy: 0 },
  isPassable: true,
  isWater: false,
  color: '#4a8f3e',
  biome: 'tropical',
  modifier: 'flat',
} as const;

/**
 * Rainforest — tropical biome with vegetated modifier.
 * Dense canopy boosts production and science through biodiversity.
 */
export const RAINFOREST: TerrainDef = {
  id: 'rainforest',
  name: 'Rainforest',
  movementCost: 2, // dense vegetation slows movement
  defenseBonus: 0.15,
  baseYields: { food: 1, production: 2, gold: 0, science: 1, culture: 0, faith: 0, influence: 0, housing: 0, diplomacy: 0 },
  isPassable: true,
  isWater: false,
  color: '#1e6b1a',
  biome: 'tropical',
  modifier: 'vegetated',
} as const;

/**
 * Mangrove — tropical biome with wet modifier.
 * Coastal wetland yielding modest food and production with science from ecosystem.
 */
export const MANGROVE: TerrainDef = {
  id: 'mangrove',
  name: 'Mangrove',
  movementCost: 2, // wetland slows movement
  defenseBonus: 0.1,
  baseYields: { food: 1, production: 2, gold: 0, science: 1, culture: 0, faith: 0, influence: 0, housing: 0, diplomacy: 0 },
  isPassable: true,
  isWater: false,
  color: '#2d5c3c',
  biome: 'tropical',
  modifier: 'wet',
} as const;

// ── W4-02: Navigable River (F-02) ────────────────────────────────────────────

/**
 * Navigable River — a wide traversable river tile rather than an edge marker.
 * Naval units treat it as water; land units cannot enter directly.
 * World-gen placement is deferred; this definition enables future map generation.
 */
export const NAVIGABLE_RIVER: TerrainDef = {
  id: 'navigable_river',
  name: 'Navigable River',
  movementCost: 1,
  defenseBonus: -0.1, // slight defensive penalty for being in open water
  baseYields: { food: 1, production: 0, gold: 1, science: 0, culture: 0, faith: 0, influence: 0, housing: 0, diplomacy: 0 },
  isPassable: false, // land units cannot enter; naval units use isWater=true
  isWater: true,     // naval units treat as water
  color: '#4a9ac0',
  biome: 'marine',
  modifier: 'wet',
} as const;

// ── W4-02: Deep Ocean (F-05) ─────────────────────────────────────────────────

/**
 * Deep Ocean — open ocean beyond the Distant Lands barrier.
 * Entering requires Cartography tech; without Shipbuilding mastery, HP attrition
 * of -15 HP/turn applies. Without any relevant tech, movement is blocked.
 *
 * World-gen placement deferred; isDeepOcean flag drives movementSystem logic.
 */
export const DEEP_OCEAN: TerrainDef = {
  id: 'deep_ocean',
  name: 'Deep Ocean',
  movementCost: 1,
  defenseBonus: 0,
  baseYields: { food: 0, production: 0, gold: 0, science: 0, culture: 0, faith: 0, influence: 0, housing: 0, diplomacy: 0 },
  isPassable: false, // blocked by default; movementSystem checks tech for override
  isWater: true,
  isDeepOcean: true,
  color: '#1a3a6e',
  biome: 'marine',
  modifier: 'flat',
} as const;

export const ALL_BASE_TERRAINS: ReadonlyArray<TerrainDef> = [
  GRASSLAND,
  PLAINS,
  DESERT,
  TUNDRA,
  SNOW,
  COAST,
  OCEAN,
  TROPICAL,
  RAINFOREST,
  MANGROVE,
  NAVIGABLE_RIVER,
  DEEP_OCEAN,
] as const;
