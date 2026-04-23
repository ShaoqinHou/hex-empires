import type { BuildingDef } from '../../types/Building';

export const BANK: BuildingDef = {
  id: 'bank',
  name: 'Bank',
  age: 'exploration',
  cost: 250,
  maintenance: 2,
  yields: { gold: 6 },
  effects: [],
  requiredTech: 'banking',
  category: 'gold',
  happinessCost: 0,
} as const;

export const UNIVERSITY: BuildingDef = {
  id: 'university',
  name: 'University',
  age: 'exploration',
  cost: 160,
  maintenance: 2,
  yields: { science: 5 },
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
  cost: 200,
  maintenance: 1,
  yields: { production: 4 },
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
  id: 'market_exp',
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
  id: 'workshop_exp',
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
  id: 'barracks_exp',
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
  isAgeless: true,
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
  requiredTech: 'military_tactics',
  category: 'wonder',
  happinessCost: 0,
  isWonder: true,
  isAgeless: true,
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
  requiredTech: 'military_tactics',
  category: 'wonder',
  happinessCost: 0,
  isWonder: true,
  isAgeless: true,
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
  requiredTech: 'education',
  category: 'wonder',
  happinessCost: 0,
  isWonder: true,
  isAgeless: true,
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
  isAgeless: true,
  greatPersonPoints: { type: 'scientist', amount: 1 },
} as const;

export const ANGKOR_WAT: BuildingDef = {
  id: 'angkor_wat',
  name: 'Angkor Wat',
  age: 'exploration',
  cost: 500,
  maintenance: 0,
  yields: { faith: 3, food: 2 },
  effects: ['Must be placed adjacent to a River', '+1 Food on all Farms in this city'],
  requiredTech: 'apprenticeship',
  category: 'wonder',
  happinessCost: 0,
  isWonder: true,
  isAgeless: true,
  greatPersonPoints: { type: 'prophet', amount: 1 },
} as const;

export const HAGIA_SOPHIA: BuildingDef = {
  id: 'hagia_sophia',
  name: 'Hagia Sophia',
  age: 'exploration',
  cost: 520,
  maintenance: 0,
  yields: { faith: 6, culture: 2 },
  effects: ['Missionaries gain +2 spread charges', 'Religion spreads 50% faster from this city'],
  requiredTech: 'printing',
  category: 'wonder',
  happinessCost: 0,
  isWonder: true,
  isAgeless: true,
  greatPersonPoints: { type: 'prophet', amount: 1 },
} as const;

export const GREAT_WALL: BuildingDef = {
  id: 'great_wall',
  name: 'Great Wall',
  age: 'exploration',
  cost: 550,
  maintenance: 0,
  yields: { culture: 3, production: 2 },
  effects: ['+6 Defense on this city', 'Enemy land units lose 1 Movement when entering adjacent tiles'],
  requiredTech: 'siege_tactics',
  category: 'wonder',
  happinessCost: 0,
  isWonder: true,
  isAgeless: true,
  greatPersonPoints: { type: 'general', amount: 1 },
} as const;

export const TERRACOTTA_ARMY: BuildingDef = {
  id: 'terracotta_army',
  name: 'Terracotta Army',
  age: 'exploration',
  cost: 500,
  maintenance: 0,
  yields: { culture: 2, production: 3 },
  effects: ['Grants one free unit of each current-age land unit type', 'All land units receive +1 promotion'],
  requiredTech: 'military_tactics',
  category: 'wonder',
  happinessCost: 0,
  isWonder: true,
  isAgeless: true,
  greatPersonPoints: { type: 'general', amount: 1 },
} as const;

export const ST_BASILS_CATHEDRAL: BuildingDef = {
  id: 'st_basils_cathedral',
  name: "St Basil's Cathedral",
  age: 'exploration',
  cost: 530,
  maintenance: 0,
  yields: { culture: 3, faith: 3 },
  effects: ['Tundra and Snow tiles in this city yield +1 Production', '+1 Great Work slot for Relics'],
  requiredTech: 'printing',
  category: 'wonder',
  happinessCost: 0,
  isWonder: true,
  isAgeless: true,
  greatPersonPoints: { type: 'prophet', amount: 1 },
} as const;

export const GRISTMILL: BuildingDef = {
  id: 'gristmill',
  name: 'Gristmill',
  age: 'exploration',
  cost: 130,
  maintenance: 1,
  yields: { food: 3, production: 1 },
  effects: ['+10% food from farms'],
  requiredTech: 'apprenticeship',
  category: 'food',
  growthRateBonus: 0.1,
  happinessCost: 0,
} as const;

export const SAWMILL: BuildingDef = {
  id: 'sawmill',
  name: 'Sawmill',
  age: 'exploration',
  cost: 150,
  maintenance: 1,
  yields: { production: 3 },
  effects: ['+1 Production from forests'],
  requiredTech: 'apprenticeship',
  category: 'military',
  happinessCost: 2,
} as const;

export const STONECUTTER: BuildingDef = {
  id: 'stonecutter',
  name: 'Stonecutter',
  age: 'exploration',
  cost: 140,
  maintenance: 1,
  yields: { production: 2, gold: 1 },
  effects: ['+1 Production from quarries'],
  requiredTech: 'apprenticeship',
  category: 'military',
  happinessCost: 2,
} as const;

export const WHARF: BuildingDef = {
  id: 'wharf',
  name: 'Wharf',
  age: 'exploration',
  cost: 160,
  maintenance: 1,
  yields: { gold: 3, food: 1 },
  effects: ['+1 trade route capacity'],
  requiredTech: 'cartography',
  category: 'gold',
  happinessCost: 0,
} as const;

export const INN: BuildingDef = {
  id: 'inn',
  name: 'Inn',
  age: 'exploration',
  cost: 120,
  maintenance: 1,
  yields: { gold: 2, culture: 1 },
  effects: ['+1 Amenity', '+1 Housing'],
  requiredTech: 'banking',
  category: 'gold',
  happinessCost: 0,
} as const;

export const TEMPLE: BuildingDef = {
  id: 'temple',
  name: 'Temple',
  age: 'exploration',
  cost: 190,
  maintenance: 2,
  yields: { faith: 4, culture: 1 },
  effects: ['+1 Relic slot'],
  requiredTech: 'printing',
  category: 'culture',
  happinessCost: 2,
} as const;

export const MENAGERIE: BuildingDef = {
  id: 'menagerie',
  name: 'Menagerie',
  age: 'exploration',
  cost: 200,
  maintenance: 2,
  yields: { culture: 2 },
  effects: ['+3 Amenities', '+1 Great Merchant point per turn'],
  requiredTech: 'astronomy',
  category: 'happiness',
  happinessCost: 0,
  greatPersonPoints: { type: 'merchant', amount: 1 },
} as const;

export const BAZAAR: BuildingDef = {
  id: 'bazaar',
  name: 'Bazaar',
  age: 'exploration',
  cost: 180,
  maintenance: 2,
  yields: { gold: 4 },
  effects: ['+1 Luxury resource slot', '+2 Amenities'],
  requiredTech: 'economics',
  category: 'gold',
  happinessCost: 0,
} as const;

export const GUILDHALL: BuildingDef = {
  id: 'guildhall',
  name: 'Guildhall',
  age: 'exploration',
  cost: 220,
  maintenance: 2,
  yields: { gold: 2, production: 2 },
  effects: ['+25% production toward buildings'],
  requiredTech: 'education',
  category: 'gold',
  happinessCost: 2,
} as const;

export const DUNGEON: BuildingDef = {
  id: 'dungeon',
  name: 'Dungeon',
  age: 'exploration',
  cost: 170,
  maintenance: 1,
  yields: { production: 1 },
  effects: ['+75 City Defense', '+1 spy capacity'],
  requiredTech: 'military_tactics',
  category: 'military',
  happinessCost: 3,
} as const;

export const PRINTING_PRESS: BuildingDef = {
  id: 'printing_press',
  name: 'Printing Press',
  age: 'exploration',
  cost: 200,
  maintenance: 2,
  yields: { culture: 4, science: 1 },
  effects: ['+1 Great Writer point per turn'],
  requiredTech: 'printing',
  category: 'culture',
  happinessCost: 2,
  greatPersonPoints: { type: 'writer', amount: 1 },
} as const;

export const TRADING_POST: BuildingDef = {
  id: 'trading_post',
  name: 'Trading Post',
  age: 'exploration',
  cost: 170,
  maintenance: 1,
  yields: { gold: 5 },
  effects: ['+1 trade route capacity', '+2 gold from trade routes'],
  requiredTech: 'banking',
  category: 'gold',
  happinessCost: 0,
} as const;

export const ALL_EXPLORATION_BUILDINGS: ReadonlyArray<BuildingDef> = [
  MARKET, WORKSHOP, MONASTERY, UNIVERSITY, OBSERVATORY,
  BANK, STOCK_EXCHANGE, BARRACKS, ARMORY, STAR_FORT, SHIPYARD, CATHEDRAL,
  GRISTMILL, SAWMILL, STONECUTTER, WHARF, INN, TEMPLE, MENAGERIE, BAZAAR, GUILDHALL, DUNGEON,
  PRINTING_PRESS, TRADING_POST,
  NOTRE_DAME, VENETIAN_ARSENAL, ALHAMBRA, TAJ_MAHAL, FORBIDDEN_CITY,
  ANGKOR_WAT, HAGIA_SOPHIA, GREAT_WALL, TERRACOTTA_ARMY, ST_BASILS_CATHEDRAL,
] as const;
