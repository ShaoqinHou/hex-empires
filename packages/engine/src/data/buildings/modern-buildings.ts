import type { BuildingDef } from './antiquity-buildings';

export const FACTORY: BuildingDef = {
  id: 'factory',
  name: 'Factory',
  age: 'modern',
  cost: 300,
  maintenance: 3,
  yields: { production: 5 },
  effects: [],
  requiredTech: 'industrialization',
} as const;

export const RESEARCH_LAB: BuildingDef = {
  id: 'research_lab',
  name: 'Research Lab',
  age: 'modern',
  cost: 350,
  maintenance: 3,
  yields: { science: 6 },
  effects: [],
  requiredTech: 'scientific_theory',
} as const;

export const POWER_PLANT: BuildingDef = {
  id: 'power_plant',
  name: 'Power Plant',
  age: 'modern',
  cost: 400,
  maintenance: 4,
  yields: { production: 4 },
  effects: [],
  requiredTech: 'electricity',
} as const;

export const NUCLEAR_PLANT: BuildingDef = {
  id: 'nuclear_plant',
  name: 'Nuclear Plant',
  age: 'modern',
  cost: 500,
  maintenance: 5,
  yields: { production: 8, science: 3 },
  effects: [],
  requiredTech: 'nuclear_fission',
} as const;

export const BROADCAST_TOWER: BuildingDef = {
  id: 'broadcast_tower',
  name: 'Broadcast Tower',
  age: 'modern',
  cost: 300,
  maintenance: 2,
  yields: { culture: 6 },
  effects: [],
  requiredTech: 'flight',
} as const;

export const ALL_MODERN_BUILDINGS: ReadonlyArray<BuildingDef> = [
  FACTORY, RESEARCH_LAB, POWER_PLANT, NUCLEAR_PLANT, BROADCAST_TOWER,
] as const;
