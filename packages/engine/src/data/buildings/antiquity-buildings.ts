import type { YieldSet } from '../../types/Yields';

export interface BuildingDef {
  readonly id: string;
  readonly name: string;
  readonly age: 'antiquity' | 'exploration' | 'modern';
  readonly cost: number;          // production cost
  readonly maintenance: number;   // gold per turn
  readonly yields: Partial<YieldSet>;
  readonly effects: ReadonlyArray<string>; // effect descriptions
  readonly requiredTech: string | null;
}

export const GRANARY: BuildingDef = {
  id: 'granary',
  name: 'Granary',
  age: 'antiquity',
  cost: 65,
  maintenance: 1,
  yields: { food: 2 },
  effects: ['+2 Housing'],
  requiredTech: 'pottery',
} as const;

export const MONUMENT: BuildingDef = {
  id: 'monument',
  name: 'Monument',
  age: 'antiquity',
  cost: 60,
  maintenance: 0,
  yields: { culture: 2 },
  effects: [],
  requiredTech: null,
} as const;

export const WALLS: BuildingDef = {
  id: 'walls',
  name: 'Ancient Walls',
  age: 'antiquity',
  cost: 80,
  maintenance: 0,
  yields: {},
  effects: ['+50 City Defense'],
  requiredTech: 'masonry',
} as const;

export const BARRACKS: BuildingDef = {
  id: 'barracks',
  name: 'Barracks',
  age: 'antiquity',
  cost: 90,
  maintenance: 1,
  yields: {},
  effects: ['+25% melee/ranged XP'],
  requiredTech: 'bronze_working',
} as const;

export const LIBRARY: BuildingDef = {
  id: 'library',
  name: 'Library',
  age: 'antiquity',
  cost: 75,
  maintenance: 1,
  yields: { science: 2 },
  effects: [],
  requiredTech: 'writing',
} as const;

export const MARKET: BuildingDef = {
  id: 'market',
  name: 'Market',
  age: 'antiquity',
  cost: 100,
  maintenance: 0,
  yields: { gold: 3 },
  effects: [],
  requiredTech: 'currency',
} as const;

export const WATERMILL: BuildingDef = {
  id: 'watermill',
  name: 'Water Mill',
  age: 'antiquity',
  cost: 80,
  maintenance: 1,
  yields: { food: 1, production: 1 },
  effects: [],
  requiredTech: 'wheel',
} as const;

export const WORKSHOP: BuildingDef = {
  id: 'workshop',
  name: 'Workshop',
  age: 'antiquity',
  cost: 120,
  maintenance: 1,
  yields: { production: 2 },
  effects: [],
  requiredTech: 'construction',
} as const;

export const SHRINE: BuildingDef = {
  id: 'shrine',
  name: 'Shrine',
  age: 'antiquity',
  cost: 70,
  maintenance: 1,
  yields: { faith: 2 },
  effects: [],
  requiredTech: 'astrology',
} as const;

export const ALL_ANTIQUITY_BUILDINGS: ReadonlyArray<BuildingDef> = [
  GRANARY, MONUMENT, WALLS, BARRACKS, LIBRARY,
  MARKET, WATERMILL, WORKSHOP, SHRINE,
] as const;
