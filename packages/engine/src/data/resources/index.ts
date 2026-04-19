export type { ResourceDef } from '../../types/Resource';
import type { ResourceDef } from '../../types/Resource';

// ── Bonus Resources ──

export const WHEAT: ResourceDef = {
  id: 'wheat',
  name: 'Wheat',
  type: 'bonus',
  yieldBonus: { food: 1 },
  validTerrains: ['grassland', 'plains'],
  happinessBonus: 0,
  bonusTable: {
    antiquity:   { yields: { food: 1 } },
    exploration: { yields: { food: 1 } },
    modern:      { yields: { food: 2 } },
  },
} as const;

export const CATTLE: ResourceDef = {
  id: 'cattle',
  name: 'Cattle',
  type: 'bonus',
  yieldBonus: { food: 1, production: 1 },
  validTerrains: ['grassland'],
  happinessBonus: 0,
  bonusTable: {
    antiquity:   { yields: { food: 1, production: 1 } },
    exploration: { yields: { food: 1, production: 1 } },
    modern:      { yields: { food: 2, production: 1 } },
  },
} as const;

export const STONE: ResourceDef = {
  id: 'stone',
  name: 'Stone',
  type: 'bonus',
  yieldBonus: { production: 1 },
  validTerrains: ['plains', 'grassland'], // typically on hills features
  happinessBonus: 0,
  bonusTable: {
    antiquity:   { yields: { production: 1 } },
    exploration: { yields: { production: 1 } },
    modern:      { yields: { production: 2 } },
  },
} as const;

// ── Empire Resources (formerly Strategic) ──

export const IRON: ResourceDef = {
  id: 'iron',
  name: 'Iron',
  type: 'empire',
  yieldBonus: { production: 1 },
  validTerrains: ['plains', 'grassland'], // typically on hills features
  happinessBonus: 0,
  bonusTable: {
    antiquity:   { combatMod: { unitCategory: 'melee', value: 2 } },
    exploration: { combatMod: { unitCategory: 'melee', value: 2 } },
    modern:      { yields: { production: 2 } },
  },
} as const;

export const HORSES: ResourceDef = {
  id: 'horses',
  name: 'Horses',
  type: 'empire',
  yieldBonus: { production: 1, gold: 1 },
  validTerrains: ['plains'],
  happinessBonus: 0,
  bonusTable: {
    antiquity:   { combatMod: { unitCategory: 'cavalry', value: 1 } },
    exploration: { combatMod: { unitCategory: 'cavalry', value: 1, versusCategory: 'infantry' } },
    modern:      { happiness: 6 },
  },
} as const;

export const NITER: ResourceDef = {
  id: 'niter',
  name: 'Niter',
  type: 'empire',
  yieldBonus: { production: 1 },
  validTerrains: ['plains', 'desert'],
  happinessBonus: 0,
  bonusTable: {
    antiquity:   {},
    exploration: { combatMod: { unitCategory: 'ranged', value: 2 } },
    modern:      { combatMod: { unitCategory: 'ranged', value: 2 } },
  },
} as const;

export const COAL: ResourceDef = {
  id: 'coal',
  name: 'Coal',
  type: 'empire',
  yieldBonus: { production: 2 },
  validTerrains: ['plains', 'grassland'],
  happinessBonus: 0,
  bonusTable: {
    antiquity:   {},
    exploration: { yields: { production: 2 } },
    modern:      { yields: { production: 3 } },
  },
} as const;

// ── City Resources (formerly Luxury) ──

export const SILK: ResourceDef = {
  id: 'silk',
  name: 'Silk',
  type: 'city',
  yieldBonus: { gold: 1 },
  validTerrains: ['grassland'],
  happinessBonus: 2,
  bonusTable: {
    antiquity:   { happiness: 2, yields: { gold: 1 } },
    exploration: { happiness: 3, yields: { gold: 2 } },
    modern:      { happiness: 4, yields: { gold: 3 } },
  },
} as const;

export const GEMS: ResourceDef = {
  id: 'gems',
  name: 'Gems',
  type: 'city',
  yieldBonus: { gold: 2 },
  validTerrains: ['plains', 'grassland'], // typically on hills features
  happinessBonus: 2,
  bonusTable: {
    antiquity:   { happiness: 2, yields: { gold: 2 } },
    exploration: { happiness: 3, yields: { gold: 3 } },
    modern:      { happiness: 4, yields: { gold: 4 } },
  },
} as const;

export const SPICES: ResourceDef = {
  id: 'spices',
  name: 'Spices',
  type: 'city',
  yieldBonus: { food: 1, gold: 1 },
  validTerrains: ['grassland'],
  happinessBonus: 1,
  bonusTable: {
    antiquity:   { happiness: 1, yields: { food: 1, gold: 1 } },
    exploration: { happiness: 2, yields: { food: 2, gold: 2 } },
    modern:      { happiness: 3, yields: { food: 2, gold: 3 } },
  },
} as const;

export const WINE: ResourceDef = {
  id: 'wine',
  name: 'Wine',
  type: 'city',
  yieldBonus: { food: 1, gold: 1 },
  validTerrains: ['plains'],
  happinessBonus: 1,
  bonusTable: {
    antiquity:   { happiness: 1, yields: { food: 1, gold: 1 } },
    exploration: { happiness: 2, yields: { food: 1, gold: 2 } },
    modern:      { happiness: 3, yields: { food: 1, gold: 3 } },
  },
} as const;

export const IVORY: ResourceDef = {
  id: 'ivory',
  name: 'Ivory',
  type: 'city',
  yieldBonus: { gold: 2, production: 1 },
  validTerrains: ['plains', 'grassland'],
  happinessBonus: 2,
  bonusTable: {
    antiquity:   { happiness: 2, yields: { gold: 2, production: 1 } },
    exploration: { happiness: 3, yields: { gold: 3, production: 2 } },
    modern:      { happiness: 3, yields: { gold: 3, production: 3 } },
  },
} as const;

export const WHALES: ResourceDef = {
  id: 'whales',
  name: 'Whales',
  type: 'bonus',
  yieldBonus: { food: 2, gold: 1 },
  validTerrains: ['ocean', 'coast'],
  happinessBonus: 0,
  bonusTable: {
    antiquity:   { yields: { food: 2, gold: 1 } },
    exploration: { yields: { food: 2, gold: 2 } },
    modern:      { yields: { food: 2, gold: 3 } },
  },
} as const;

export const ALL_RESOURCES: ReadonlyArray<ResourceDef> = [
  // Bonus
  WHEAT,
  CATTLE,
  STONE,
  WHALES,
  // Empire (formerly Strategic)
  IRON,
  HORSES,
  NITER,
  COAL,
  // City (formerly Luxury)
  SILK,
  GEMS,
  SPICES,
  WINE,
  IVORY,
] as const;
