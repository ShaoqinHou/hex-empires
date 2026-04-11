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

export const SHIPYARD: BuildingDef = {
  id: 'shipyard',
  name: 'Shipyard',
  age: 'exploration',
  cost: 220,
  maintenance: 2,
  yields: { gold: 2, production: 1 },
  effects: ['+25% naval unit production speed'],
  requiredTech: 'cartography',
  category: 'military',
  happinessCost: 3,
} as const;

export const CATHEDRAL: BuildingDef = {
  id: 'cathedral',
  name: 'Cathedral',
  age: 'exploration',
  cost: 240,
  maintenance: 2,
  yields: { culture: 3, faith: 2 },
  effects: ['+2 Happiness'],
  requiredTech: 'printing',
  category: 'culture',
  happinessCost: 3,
} as const;

export const MARKET: BuildingDef = {
  id: 'market',
  name: 'Market',
  age: 'exploration',
  cost: 120,
  maintenance: 1,
  yields: { gold: 3 },
  effects: [],
  requiredTech: 'banking',
  category: 'gold',
  happinessCost: 2,
} as const;

export const WORKSHOP: BuildingDef = {
  id: 'workshop',
  name: 'Workshop',
  age: 'exploration',
  cost: 150,
  maintenance: 2,
  yields: { production: 3 },
  effects: [],
  requiredTech: 'military_tactics',
  category: 'military',
  happinessCost: 3,
} as const;

export const OBSERVATORY: BuildingDef = {
  id: 'observatory',
  name: 'Observatory',
  age: 'exploration',
  cost: 180,
  maintenance: 2,
  yields: { science: 5 },
  effects: [],
  requiredTech: 'astronomy',
  category: 'science',
  happinessCost: 3,
} as const;

export const MONASTERY: BuildingDef = {
  id: 'monastery',
  name: 'Monastery',
  age: 'exploration',
  cost: 160,
  maintenance: 1,
  yields: { faith: 3, culture: 2 },
  effects: ['+1 Happiness'],
  requiredTech: 'printing',
  category: 'culture',
  happinessCost: 2,
} as const;

export const BARRACKS: BuildingDef = {
  id: 'barracks',
  name: 'Barracks',
  age: 'exploration',
  cost: 140,
  maintenance: 2,
  yields: { production: 2 },
  effects: ['+15% land unit production speed'],
  requiredTech: 'military_tactics',
  category: 'military',
  happinessCost: 2,
} as const;

// ── World Wonders (Exploration) ──

export const NOTRE_DAME: BuildingDef = {
  id: 'notre_dame',
  name: 'Notre Dame',
  age: 'exploration',
  cost: 500,
  maintenance: 0,
  yields: { faith: 5, culture: 5 },
  effects: ['+2 Faith adjacency', '+1 Relic slot', '+1 Great Prophet point per turn'],
  requiredTech: 'printing',
  category: 'wonder',
  happinessCost: 0,
  isWonder: true,
  greatPersonPoints: { type: 'prophet', amount: 1 },
} as const;

export const VENETIAN_ARSENAL: BuildingDef = {
  id: 'venetian_arsenal',
  name: 'Venetian Arsenal',
  age: 'exploration',
  cost: 550,
  maintenance: 0,
  yields: { production: 5 },
  effects: ['+1 naval unit capacity', '+50% naval unit production speed', 'All naval units start with +1 promotion'],
  requiredTech: 'ballistics',
  category: 'wonder',
  happinessCost: 0,
  isWonder: true,
  greatPersonPoints: { type: 'engineer', amount: 1 },
} as const;

export const ALHAMBRA: BuildingDef = {
  id: 'alhambra',
  name: 'Alhambra',
  age: 'exploration',
  cost: 450,
  maintenance: 0,
  yields: { culture: 5 },
  effects: ['+1 Culture adjacency', '+1 Great General point per turn', 'All units receive +1 movement'],
  requiredTech: 'castles',
  category: 'wonder',
  happinessCost: 0,
  isWonder: true,
  greatPersonPoints: { type: 'general', amount: 1 },
} as const;

export const TAJ_MAHAL: BuildingDef = {
  id: 'taj_mahal',
  name: 'Taj Mahal',
  age: 'exploration',
  cost: 520,
  maintenance: 0,
  yields: { gold: 4, culture: 4 },
  effects: ['+2 Happiness', '+1 Great Merchant point per turn', 'Instant 1000 gold upon completion'],
  requiredTech: 'architecture',
  category: 'wonder',
  happinessCost: 0,
  isWonder: true,
  greatPersonPoints: { type: 'merchant', amount: 1 },
} as const;

export const FORBIDDEN_CITY: BuildingDef = {
  id: 'forbidden_city',
  name: 'Forbidden City',
  age: 'exploration',
  cost: 600,
  maintenance: 0,
  yields: { science: 5 },
  effects: ['+1 Science adjacency', '+1 Great Scientist point per turn', '+1 wildcard policy slot'],
  requiredTech: 'printing',
  category: 'wonder',
  happinessCost: 0,
  isWonder: true,
  greatPersonPoints: { type: 'scientist', amount: 1 },
} as const;

export const ALL_EXPLORATION_BUILDINGS: ReadonlyArray<BuildingDef> = [
  MARKET, WORKSHOP, MONASTERY, UNIVERSITY, OBSERVATORY,
  BANK, STOCK_EXCHANGE, BARRACKS, ARMORY, STAR_FORT, SHIPYARD, CATHEDRAL,
  NOTRE_DAME, VENETIAN_ARSENAL, ALHAMBRA, TAJ_MAHAL, FORBIDDEN_CITY,
] as const;
