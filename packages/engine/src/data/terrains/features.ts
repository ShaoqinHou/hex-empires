import type { TerrainFeatureDef } from '../../types/Terrain';

export const HILLS: TerrainFeatureDef = {
  id: 'hills',
  name: 'Hills',
  movementCostModifier: 1, // +1 to enter
  defenseBonusModifier: 0.3, // +30% defense
  yieldModifiers: { production: 1 },
  blocksMovement: false,
  color: '#6b5b3a',
} as const;

export const MOUNTAINS: TerrainFeatureDef = {
  id: 'mountains',
  name: 'Mountains',
  movementCostModifier: 0,
  defenseBonusModifier: 0,
  yieldModifiers: {},
  blocksMovement: true, // impassable
  color: '#8a8a8a',
} as const;

export const FOREST: TerrainFeatureDef = {
  id: 'forest',
  name: 'Forest',
  movementCostModifier: 1,
  defenseBonusModifier: 0.25,
  yieldModifiers: { production: 1 },
  blocksMovement: false,
  color: '#2d5a1e',
} as const;

export const JUNGLE: TerrainFeatureDef = {
  id: 'jungle',
  name: 'Jungle',
  movementCostModifier: 1,
  defenseBonusModifier: 0.25,
  yieldModifiers: { food: 1 },
  blocksMovement: false,
  color: '#1a4a0f',
} as const;

export const MARSH: TerrainFeatureDef = {
  id: 'marsh',
  name: 'Marsh',
  movementCostModifier: 1,
  defenseBonusModifier: -0.15, // negative defense
  yieldModifiers: { food: 1 },
  blocksMovement: false,
  color: '#5a6b3a',
} as const;

export const FLOODPLAINS: TerrainFeatureDef = {
  id: 'floodplains',
  name: 'Floodplains',
  movementCostModifier: 0,
  defenseBonusModifier: -0.1,
  yieldModifiers: { food: 3 },
  blocksMovement: false,
  color: '#7a9a4a',
} as const;

export const OASIS: TerrainFeatureDef = {
  id: 'oasis',
  name: 'Oasis',
  movementCostModifier: 0,
  defenseBonusModifier: 0,
  yieldModifiers: { food: 3, gold: 1 },
  blocksMovement: false,
  color: '#4ab87a',
} as const;

export const REEF: TerrainFeatureDef = {
  id: 'reef',
  name: 'Reef',
  movementCostModifier: 0,
  defenseBonusModifier: 0,
  yieldModifiers: { food: 1, production: 1 },
  blocksMovement: false,
  color: '#3a8aaa',
} as const;

export const ALL_FEATURES: ReadonlyArray<TerrainFeatureDef> = [
  HILLS,
  MOUNTAINS,
  FOREST,
  JUNGLE,
  MARSH,
  FLOODPLAINS,
  OASIS,
  REEF,
] as const;
