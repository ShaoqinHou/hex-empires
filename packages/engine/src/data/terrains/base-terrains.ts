import type { TerrainDef } from '../../types/Terrain';

export const GRASSLAND: TerrainDef = {
  id: 'grassland',
  name: 'Grassland',
  movementCost: 1,
  defenseBonus: 0,
  baseYields: { food: 2, production: 0, gold: 0, science: 0, culture: 0, faith: 0 },
  isPassable: true,
  isWater: false,
  color: '#4a7c3f',
} as const;

export const PLAINS: TerrainDef = {
  id: 'plains',
  name: 'Plains',
  movementCost: 1,
  defenseBonus: 0,
  baseYields: { food: 1, production: 1, gold: 0, science: 0, culture: 0, faith: 0 },
  isPassable: true,
  isWater: false,
  color: '#8b9d4a',
} as const;

export const DESERT: TerrainDef = {
  id: 'desert',
  name: 'Desert',
  movementCost: 1,
  defenseBonus: 0,
  baseYields: { food: 0, production: 0, gold: 0, science: 0, culture: 0, faith: 0 },
  isPassable: true,
  isWater: false,
  color: '#d4b96e',
} as const;

export const TUNDRA: TerrainDef = {
  id: 'tundra',
  name: 'Tundra',
  movementCost: 1,
  defenseBonus: 0,
  baseYields: { food: 1, production: 0, gold: 0, science: 0, culture: 0, faith: 0 },
  isPassable: true,
  isWater: false,
  color: '#8a9b82',
} as const;

export const SNOW: TerrainDef = {
  id: 'snow',
  name: 'Snow',
  movementCost: 1,
  defenseBonus: 0,
  baseYields: { food: 0, production: 0, gold: 0, science: 0, culture: 0, faith: 0 },
  isPassable: true,
  isWater: false,
  color: '#dce8e8',
} as const;

export const COAST: TerrainDef = {
  id: 'coast',
  name: 'Coast',
  movementCost: 1,
  defenseBonus: 0,
  baseYields: { food: 1, production: 0, gold: 1, science: 0, culture: 0, faith: 0 },
  isPassable: false, // not passable by land units
  isWater: true,
  color: '#4a90b8',
} as const;

export const OCEAN: TerrainDef = {
  id: 'ocean',
  name: 'Ocean',
  movementCost: 1,
  defenseBonus: 0,
  baseYields: { food: 1, production: 0, gold: 0, science: 0, culture: 0, faith: 0 },
  isPassable: false,
  isWater: true,
  color: '#2a5f8a',
} as const;

export const ALL_BASE_TERRAINS: ReadonlyArray<TerrainDef> = [
  GRASSLAND,
  PLAINS,
  DESERT,
  TUNDRA,
  SNOW,
  COAST,
  OCEAN,
] as const;
