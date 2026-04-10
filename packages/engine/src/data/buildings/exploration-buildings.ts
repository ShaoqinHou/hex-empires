import type { BuildingDef } from './antiquity-buildings';

export const BANK: BuildingDef = {
  id: 'bank',
  name: 'Bank',
  age: 'exploration',
  cost: 200,
  maintenance: 2,
  yields: { gold: 5 },
  effects: [],
  requiredTech: 'banking',
  category: 'gold',
  happinessCost: 0,
} as const;

export const UNIVERSITY: BuildingDef = {
  id: 'university',
  name: 'University',
  age: 'exploration',
  cost: 200,
  maintenance: 2,
  yields: { science: 4 },
  effects: [],
  requiredTech: 'education',
  category: 'science',
  happinessCost: 3,
} as const;

export const STOCK_EXCHANGE: BuildingDef = {
  id: 'stock_exchange',
  name: 'Stock Exchange',
  age: 'exploration',
  cost: 300,
  maintenance: 3,
  yields: { gold: 7 },
  effects: [],
  requiredTech: 'economics',
  category: 'gold',
  happinessCost: 0,
} as const;

export const ARMORY: BuildingDef = {
  id: 'armory',
  name: 'Armory',
  age: 'exploration',
  cost: 180,
  maintenance: 1,
  yields: {},
  effects: ['+25% military XP'],
  requiredTech: 'military_tactics',
  category: 'military',
  happinessCost: 3,
} as const;

export const STAR_FORT: BuildingDef = {
  id: 'star_fort',
  name: 'Star Fort',
  age: 'exploration',
  cost: 250,
  maintenance: 0,
  yields: {},
  effects: ['+100 City Defense'],
  requiredTech: 'siege_tactics',
  category: 'military',
  happinessCost: 3,
} as const;

export const ALL_EXPLORATION_BUILDINGS: ReadonlyArray<BuildingDef> = [
  BANK, UNIVERSITY, STOCK_EXCHANGE, ARMORY, STAR_FORT,
] as const;
