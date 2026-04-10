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
  readonly growthRateBonus?: number; // 0-1 fraction; reduces growth threshold (e.g. 0.1 = -10% threshold)
}

export const GRANARY: BuildingDef = {
  id: 'granary',
  name: 'Granary',
  age: 'antiquity',
  cost: 65,
  maintenance: 1,
  yields: { food: 2 },
  effects: ['+2 Housing', '+10% Growth Rate'],
  requiredTech: 'pottery',
  growthRateBonus: 0.1,
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
  effects: ['+5% Growth Rate'],
  requiredTech: 'wheel',
  growthRateBonus: 0.05,
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

export const PALACE: BuildingDef = {
  id: 'palace',
  name: 'Palace',
  age: 'antiquity',
  cost: 0, // auto-built in capital
  maintenance: 0,
  yields: { food: 5, production: 5 },
  effects: ['+5 Happiness', '+1 Culture adjacency', '+1 Science adjacency'],
  requiredTech: null,
} as const;

export const ALL_ANTIQUITY_BUILDINGS: ReadonlyArray<BuildingDef> = [
  PALACE, GRANARY, MONUMENT, WALLS, BARRACKS, LIBRARY,
  MARKET, WATERMILL, WORKSHOP, SHRINE,
] as const;
