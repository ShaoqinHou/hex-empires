import type { TerrainDef } from '../../types/Terrain';

export const GRASSLAND: TerrainDef = {
  id: 'grassland',
  name: 'Grassland',
  movementCost: 1,
  defenseBonus: 0,
  baseYields: { food: 2, production: 0, gold: 0, science: 0, culture: 0, faith: 0 },
  isPassable: true,
  isWater: false,
  color: '#5c9e4a',
} as const;

export const PLAINS: TerrainDef = {
  id: 'plains',
  name: 'Plains',
  movementCost: 1,
  defenseBonus: 0,
  baseYields: { food: 1, production: 1, gold: 0, science: 0, culture: 0, faith: 0 },
  isPassable: true,
  isWater: false,
  color: '#a8b84e',
} as const;

export const DESERT: TerrainDef = {
  id: 'desert',
  name: 'Desert',
  movementCost: 1,
  defenseBonus: 0,
  baseYields: { food: 0, production: 0, gold: 0, science: 0, culture: 0, faith: 0 },
  isPassable: true,
  isWater: false,
  color: '#e8d48b',
} as const;

export const TUNDRA: TerrainDef = {
  id: 'tundra',
  name: 'Tundra',
  movementCost: 1,
  defenseBonus: 0,
  baseYields: { food: 1, production: 0, gold: 0, science: 0, culture: 0, faith: 0 },
  isPassable: true,
  isWater: false,
  color: '#9eb89a',
} as const;

export const SNOW: TerrainDef = {
  id: 'snow',
  name: 'Snow',
  movementCost: 1,
  defenseBonus: 0,
  baseYields: { food: 0, production: 0, gold: 0, science: 0, culture: 0, faith: 0 },
  isPassable: true,
  isWater: false,
  color: '#e8f0f0',
} as const;

export const COAST: TerrainDef = {
  id: 'coast',
  name: 'Coast',
  movementCost: 1,
  defenseBonus: 0,
  baseYields: { food: 1, production: 0, gold: 1, science: 0, culture: 0, faith: 0 },
  isPassable: false, // not passable by land units
  isWater: true,
  color: '#5ba8d4',
} as const;

export const OCEAN: TerrainDef = {
  id: 'ocean',
  name: 'Ocean',
  movementCost: 1,
  defenseBonus: 0,
  baseYields: { food: 1, production: 0, gold: 0, science: 0, culture: 0, faith: 0 },
  isPassable: false,
  isWater: true,
  color: '#3574a8',
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
