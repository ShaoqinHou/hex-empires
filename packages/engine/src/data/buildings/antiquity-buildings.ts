export type { BuildingDef } from '../../types/Building';
import type { BuildingDef } from '../../types/Building';

export const GRANARY: BuildingDef = {
  id: 'granary',
  name: 'Granary',
  age: 'antiquity',
  cost: 55,
  maintenance: 1,
  yields: { food: 1 },
  effects: ['+2 Housing', '+10% Growth Rate'],
  requiredTech: 'pottery',
  growthRateBonus: 0.1,
  category: 'food',
  happinessCost: 0,
} as const;

export const MONUMENT: BuildingDef = {
  id: 'monument',
  name: 'Monument',
  age: 'antiquity',
  cost: 90,
  maintenance: 0,
  yields: { culture: 2 },
  effects: [],
  requiredTech: null,
  category: 'culture',
  happinessCost: 2,
} as const;

export const WALLS: BuildingDef = {
  id: 'walls',
  name: 'Ancient Walls',
  age: 'antiquity',
  cost: 60,
  maintenance: 0,
  yields: {},
  effects: ['+50 City Defense'],
  requiredTech: 'masonry',
  category: 'military',
  happinessCost: 2,
} as const;

export const BARRACKS: BuildingDef = {
  id: 'barracks',
  name: 'Barracks',
  age: 'antiquity',
  cost: 60,
  maintenance: 1,
  yields: { production: 2 },
  effects: ['+25% melee/ranged XP'],
  requiredTech: 'bronze_working',
  category: 'military',
  happinessCost: 2,
} as const;

export const LIBRARY: BuildingDef = {
  id: 'library',
  name: 'Library',
  age: 'antiquity',
  cost: 90,
  maintenance: 1,
  yields: { science: 3 },
  effects: [],
  requiredTech: 'writing',
  category: 'science',
  happinessCost: 2,
  codexSlots: 2,
} as const;

export const MARKET: BuildingDef = {
  id: 'market',
  name: 'Market',
  age: 'antiquity',
  cost: 90,
  maintenance: 0,
  yields: { gold: 5 },
  effects: [],
  requiredTech: 'currency',
  category: 'gold',
  happinessCost: 0,
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
  category: 'food',
  happinessCost: 0,
} as const;

export const WORKSHOP: BuildingDef = {
  id: 'workshop',
  name: 'Workshop',
  age: 'antiquity',
  cost: 80,
  maintenance: 1,
  yields: { production: 3 },
  effects: [],
  requiredTech: 'construction',
  category: 'military',
  happinessCost: 2,
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
  category: 'culture',
  happinessCost: 2,
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
  category: 'happiness',
  happinessCost: 0,
  codexSlots: 1,
} as const;

// ── World Wonders (Antiquity) ──

export const PYRAMIDS: BuildingDef = {
  id: 'pyramids',
  name: 'The Pyramids',
  age: 'antiquity',
  cost: 400,
  maintenance: 0,
  yields: { food: 5, culture: 3 },
  effects: ['+2 Builder charges', '+15% production toward Districts', '+1 Great Engineer point per turn'],
  requiredTech: 'masonry',
  category: 'wonder',
  happinessCost: 0,
  isWonder: true,
  isAgeless: true,
  greatPersonPoints: { type: 'engineer', amount: 1 },
  adjacencyEffect: { yield: 'faith', value: 2, targetCategory: 'urban' },
} as const;

export const HANGING_GARDENS: BuildingDef = {
  id: 'hanging_gardens',
  name: 'Hanging Gardens',
  age: 'antiquity',
  cost: 350,
  maintenance: 0,
  yields: { food: 8, happiness: 2 },
  effects: ['+25% growth rate in all cities', '+1 Housing per district'],
  requiredTech: 'irrigation',
  category: 'wonder',
  happinessCost: 0,
  isWonder: true,
  isAgeless: true,
  greatPersonPoints: { type: 'merchant', amount: 1 },
  adjacencyEffect: { yield: 'food', value: 1, targetCategory: 'all' },
} as const;

export const COLOSSUS: BuildingDef = {
  id: 'colossus',
  name: 'Colossus',
  age: 'antiquity',
  cost: 300,
  maintenance: 0,
  yields: { gold: 8 },
  effects: ['+1 trade route capacity', '+2 gold from all trade routes'],
  requiredTech: 'currency',
  category: 'wonder',
  happinessCost: 0,
  isWonder: true,
  isAgeless: true,
  greatPersonPoints: { type: 'merchant', amount: 1 },
  // No adjacencyEffect — falls back to generic WONDER_ADJACENCY_PER_NEIGHBOR (+2 culture, +1 science)
} as const;

export const STONEHENGE: BuildingDef = {
  id: 'stonehenge',
  name: 'Stonehenge',
  age: 'antiquity',
  cost: 250,
  maintenance: 0,
  yields: { faith: 5 },
  effects: ['+1 faith from each unimproved wonder tile', '+1 Great Prophet point per turn'],
  requiredTech: 'astrology',
  category: 'wonder',
  happinessCost: 0,
  isWonder: true,
  isAgeless: true,
  greatPersonPoints: { type: 'prophet', amount: 1 },
  adjacencyEffect: { yield: 'faith', value: 1, targetCategory: 'all' },
} as const;

export const ORACLE: BuildingDef = {
  id: 'oracle',
  name: 'The Oracle',
  age: 'antiquity',
  cost: 280,
  maintenance: 0,
  yields: { culture: 8 },
  effects: ['+1 Great Writer point per turn', '+25% great person generation'],
  requiredTech: 'construction',
  category: 'wonder',
  happinessCost: 0,
  isWonder: true,
  isAgeless: true,
  greatPersonPoints: { type: 'writer', amount: 1 },
  adjacencyEffect: { yield: 'culture', value: 1, targetCategory: 'all' },
} as const;

export const BATH: BuildingDef = {
  id: 'bath',
  name: 'Bath',
  age: 'antiquity',
  cost: 90,
  maintenance: 1,
  yields: { happiness: 2 },
  effects: ['+2 Amenities', '+10% Growth Rate'],
  requiredTech: 'construction',
  category: 'happiness',
  growthRateBonus: 0.1,
  happinessCost: 0,
} as const;

export const ARENA: BuildingDef = {
  id: 'arena',
  name: 'Arena',
  age: 'antiquity',
  cost: 110,
  maintenance: 1,
  yields: { culture: 1 },
  effects: ['+3 Amenities'],
  requiredTech: 'construction',
  category: 'happiness',
  happinessCost: 0,
} as const;

export const ALTAR: BuildingDef = {
  id: 'altar',
  name: 'Altar',
  age: 'antiquity',
  cost: 80,
  maintenance: 1,
  yields: { faith: 3 },
  effects: ['+1 Amenity from faith'],
  requiredTech: 'astrology',
  category: 'culture',
  happinessCost: 2,
} as const;

export const VILLA: BuildingDef = {
  id: 'villa',
  name: 'Villa',
  age: 'antiquity',
  cost: 100,
  maintenance: 1,
  yields: { gold: 2, culture: 1 },
  effects: ['+1 Housing'],
  requiredTech: 'currency',
  category: 'gold',
  happinessCost: 0,
} as const;

export const AMPHITHEATRE: BuildingDef = {
  id: 'amphitheatre',
  name: 'Amphitheatre',
  age: 'antiquity',
  cost: 120,
  maintenance: 1,
  yields: { culture: 3 },
  effects: ['+2 Amenities', '+1 Great Writer slot'],
  requiredTech: 'writing',
  category: 'culture',
  happinessCost: 2,
} as const;

export const GARDEN: BuildingDef = {
  id: 'garden',
  name: 'Garden',
  age: 'antiquity',
  cost: 80,
  maintenance: 1,
  yields: { food: 1, culture: 1 },
  effects: ['+15% great person generation'],
  requiredTech: 'irrigation',
  category: 'culture',
  growthRateBonus: 0.05,
  happinessCost: 0,
} as const;

export const BLACKSMITH: BuildingDef = {
  id: 'blacksmith',
  name: 'Blacksmith',
  age: 'antiquity',
  cost: 95,
  maintenance: 1,
  yields: { production: 2 },
  effects: ['+10% unit production speed'],
  requiredTech: 'iron_working',
  category: 'military',
  happinessCost: 2,
} as const;

export const AQUEDUCT: BuildingDef = {
  id: 'aqueduct',
  name: 'Aqueduct',
  age: 'antiquity',
  cost: 75,
  maintenance: 0,
  yields: { happiness: 3 },
  effects: ['+20% Growth Rate'],
  requiredTech: 'construction',
  category: 'food',
  growthRateBonus: 0.2,
  happinessCost: 0,
} as const;

export const GIZA: BuildingDef = {
  id: 'giza',
  name: 'Great Pyramid of Giza',
  age: 'antiquity',
  cost: 420,
  maintenance: 0,
  yields: { production: 5, faith: 3 },
  effects: ['+2 Production on all Desert tiles in this city', '+1 Great Engineer point per turn', '+10% wonder production empire-wide'],
  requiredTech: 'masonry',
  category: 'wonder',
  happinessCost: 0,
  isWonder: true,
  isAgeless: true,
  greatPersonPoints: { type: 'engineer', amount: 1 },
} as const;

export const GREAT_LIBRARY: BuildingDef = {
  id: 'great_library',
  name: 'Great Library',
  age: 'antiquity',
  cost: 380,
  maintenance: 0,
  yields: { science: 8 },
  effects: ['+3 Science adjacency', '+1 Great Scientist point per turn', '+4 Codex slots', 'Free technology when any other civ researches a technology you have not'],
  requiredTech: 'writing',
  category: 'wonder',
  happinessCost: 0,
  isWonder: true,
  isAgeless: true,
  greatPersonPoints: { type: 'scientist', amount: 1 },
  codexSlots: 4,
  adjacencyEffect: { yield: 'science', value: 2, targetCategory: 'urban' },
} as const;

export const STOREHOUSE: BuildingDef = {
  id: 'storehouse',
  name: 'Storehouse',
  age: 'antiquity',
  cost: 85,
  maintenance: 0,
  yields: { food: 2, gold: 1 },
  effects: ['+1 Housing', '+5% Growth Rate'],
  requiredTech: 'pottery',
  growthRateBonus: 0.05,
  category: 'food',
  happinessCost: 0,
} as const;

export const DOCKYARD: BuildingDef = {
  id: 'dockyard',
  name: 'Dockyard',
  age: 'antiquity',
  cost: 95,
  maintenance: 1,
  yields: { gold: 2, food: 1 },
  effects: ['+1 trade route capacity'],
  requiredTech: 'sailing',
  category: 'gold',
  happinessCost: 0,
} as const;

export const LIGHTHOUSE: BuildingDef = {
  id: 'lighthouse',
  name: 'Lighthouse',
  age: 'antiquity',
  cost: 80,
  maintenance: 1,
  yields: { gold: 3 },
  effects: ['+1 trade route capacity for coastal cities', '+1 sight range for naval units'],
  requiredTech: 'sailing',
  category: 'gold',
  happinessCost: 0,
} as const;

export const FORUM: BuildingDef = {
  id: 'forum',
  name: 'Forum',
  age: 'antiquity',
  cost: 100,
  maintenance: 1,
  yields: { gold: 2, culture: 1 },
  effects: ['+25% culture policy generation', '+1 civic research slot'],
  requiredTech: 'currency',
  category: 'culture',
  happinessCost: 2,
} as const;

export const TEMPLE_OF_ARTEMIS: BuildingDef = {
  id: 'temple_of_artemis',
  name: 'Temple of Artemis',
  age: 'antiquity',
  cost: 360,
  maintenance: 0,
  yields: { food: 4, faith: 2 },
  effects: ['+1 Food per Forest or Jungle tile in this city', '+1 Great Prophet point per turn', '+1 Housing in all cities'],
  requiredTech: 'archery',
  category: 'wonder',
  happinessCost: 0,
  isWonder: true,
  isAgeless: true,
  greatPersonPoints: { type: 'prophet', amount: 1 },
} as const;

// ── CC3.2 — Civilization unique buildings (antiquity) ───────────────────────

/** Greece unique building. +2 culture, +1 science when adjacent to a Mountain tile. */
export const ACROPOLIS: BuildingDef = {
  id: 'acropolis',
  name: 'Acropolis',
  age: 'antiquity',
  cost: 110,
  maintenance: 1,
  yields: { culture: 2, science: 1 },
  effects: ['+2 Culture', '+1 Science', '+1 Science per adjacent Mountain tile'],
  requiredTech: 'bronze_working',
  category: 'culture',
  happinessCost: 2,
  isCivUnique: true,
  civId: 'greece',
} as const;

/**
 * Egypt unique building. Civ-unique wonder-like district building.
 * +1 production in all Egyptian cities; provides +1 worker charge.
 * Distinct from the PYRAMIDS world wonder.
 */
export const PYRAMID: BuildingDef = {
  id: 'pyramid',
  name: 'Pyramid',
  age: 'antiquity',
  cost: 200,
  maintenance: 0,
  yields: { production: 1, food: 1 },
  effects: ['+1 Builder charge', '+1 Production per city empire-wide'],
  requiredTech: 'masonry',
  category: 'wonder',
  happinessCost: 0,
  isCivUnique: true,
  civId: 'egypt',
} as const;

export const ALL_ANTIQUITY_BUILDINGS: ReadonlyArray<BuildingDef> = [
  PALACE, GRANARY, MONUMENT, WALLS, BARRACKS, LIBRARY,
  MARKET, WATERMILL, WORKSHOP, SHRINE,
  BATH, ARENA, ALTAR, VILLA, AMPHITHEATRE, GARDEN, BLACKSMITH, AQUEDUCT,
  STOREHOUSE, DOCKYARD,
  LIGHTHOUSE, FORUM,
  ACROPOLIS, PYRAMID,
  PYRAMIDS, HANGING_GARDENS, COLOSSUS, STONEHENGE, ORACLE,
  GIZA, GREAT_LIBRARY, TEMPLE_OF_ARTEMIS,
] as const;
