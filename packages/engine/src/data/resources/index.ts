import type { YieldSet } from '../../types/Yields';

export interface ResourceDef {
  readonly id: string;
  readonly name: string;
  readonly type: 'bonus' | 'strategic' | 'luxury';
  readonly yieldBonus: Partial<YieldSet>;
  readonly validTerrains: ReadonlyArray<string>; // terrain IDs where this can spawn
  readonly happinessBonus: number; // luxury resources give happiness
}

// ── Bonus Resources ──

export const WHEAT: ResourceDef = {
  id: 'wheat',
  name: 'Wheat',
  type: 'bonus',
  yieldBonus: { food: 1 },
  validTerrains: ['grassland', 'plains'],
  happinessBonus: 0,
} as const;

export const CATTLE: ResourceDef = {
  id: 'cattle',
  name: 'Cattle',
  type: 'bonus',
  yieldBonus: { food: 1, production: 1 },
  validTerrains: ['grassland'],
  happinessBonus: 0,
} as const;

export const STONE: ResourceDef = {
  id: 'stone',
  name: 'Stone',
  type: 'bonus',
  yieldBonus: { production: 1 },
  validTerrains: ['plains', 'grassland'], // typically on hills features
  happinessBonus: 0,
} as const;

// ── Strategic Resources ──

export const IRON: ResourceDef = {
  id: 'iron',
  name: 'Iron',
  type: 'strategic',
  yieldBonus: { production: 1 },
  validTerrains: ['plains', 'grassland'], // typically on hills features
  happinessBonus: 0,
} as const;

export const HORSES: ResourceDef = {
  id: 'horses',
  name: 'Horses',
  type: 'strategic',
  yieldBonus: { production: 1, gold: 1 },
  validTerrains: ['plains'],
  happinessBonus: 0,
} as const;

export const NITER: ResourceDef = {
  id: 'niter',
  name: 'Niter',
  type: 'strategic',
  yieldBonus: { production: 1 },
  validTerrains: ['plains', 'desert'],
  happinessBonus: 0,
} as const;

// ── Luxury Resources ──

export const SILK: ResourceDef = {
  id: 'silk',
  name: 'Silk',
  type: 'luxury',
  yieldBonus: { gold: 1 },
  validTerrains: ['grassland'],
  happinessBonus: 2,
} as const;

export const GEMS: ResourceDef = {
  id: 'gems',
  name: 'Gems',
  type: 'luxury',
  yieldBonus: { gold: 2 },
  validTerrains: ['plains', 'grassland'], // typically on hills features
  happinessBonus: 2,
} as const;

export const SPICES: ResourceDef = {
  id: 'spices',
  name: 'Spices',
  type: 'luxury',
  yieldBonus: { food: 1, gold: 1 },
  validTerrains: ['grassland'],
  happinessBonus: 1,
} as const;

export const WINE: ResourceDef = {
  id: 'wine',
  name: 'Wine',
  type: 'luxury',
  yieldBonus: { food: 1, gold: 1 },
  validTerrains: ['plains'],
  happinessBonus: 1,
} as const;

export const ALL_RESOURCES: ReadonlyArray<ResourceDef> = [
  // Bonus
  WHEAT,
  CATTLE,
  STONE,
  // Strategic
  IRON,
  HORSES,
  NITER,
  // Luxury
  SILK,
  GEMS,
  SPICES,
  WINE,
] as const;
