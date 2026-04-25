export type { UnitDef } from '../../types/Unit';
import type { UnitDef } from '../../types/Unit';

export const BALLISTA: UnitDef = {
  id: 'ballista',
  name: 'Ballista',
  age: 'antiquity',
  category: 'siege',
  cost: 80,
  combat: 10,
  rangedCombat: 30,
  range: 2,
  movement: 2,
  sightRange: 2,
  requiredTech: 'mathematics',
  upgradesTo: 'catapult',
  abilities: [],
} as const;

export const PHALANX: UnitDef = {
  id: 'phalanx',
  name: 'Phalanx',
  age: 'antiquity',
  category: 'melee',
  cost: 70,
  combat: 28,
  rangedCombat: 0,
  range: 0,
  movement: 2,
  sightRange: 2,
  requiredTech: 'bronze_working',
  upgradesTo: 'pikeman',
  abilities: ['anti_cavalry', 'formation'],
} as const;

export const ANTIQUITY_HORSEMAN: UnitDef = {
  id: 'antiquity_horseman',
  name: 'Horseman',
  age: 'antiquity',
  category: 'cavalry',
  cost: 60,
  combat: 22,
  rangedCombat: 0,
  range: 0,
  movement: 4,
  sightRange: 2,
  requiredTech: 'wheel',
  requiredResource: 'horses',
  upgradesTo: 'horseman',
  abilities: [],
} as const;

export const WARRIOR: UnitDef = {
  id: 'warrior',
  name: 'Warrior',
  age: 'antiquity',
  category: 'melee',
  cost: 30,
  combat: 20,
  rangedCombat: 0,
  range: 0,
  movement: 2,
  sightRange: 2,
  requiredTech: null,
  upgradesTo: 'swordsman',
  abilities: [],
} as const;

export const SLINGER: UnitDef = {
  id: 'slinger',
  name: 'Slinger',
  age: 'antiquity',
  category: 'ranged',
  cost: 30,
  combat: 5,
  rangedCombat: 15,
  range: 2,
  movement: 2,
  sightRange: 2,
  requiredTech: null,
  upgradesTo: 'archer',
  abilities: [],
} as const;

export const ARCHER: UnitDef = {
  id: 'archer',
  name: 'Archer',
  age: 'antiquity',
  category: 'ranged',
  cost: 50,
  combat: 10,
  rangedCombat: 20,
  range: 2,
  movement: 2,
  sightRange: 2,
  requiredTech: 'bronze_working',
  upgradesTo: 'crossbowman',
  abilities: [],
} as const;

export const SCOUT: UnitDef = {
  id: 'scout',
  name: 'Scout',
  age: 'antiquity',
  category: 'melee',
  cost: 30,
  combat: 10,
  rangedCombat: 0,
  range: 0,
  movement: 2,
  sightRange: 3,
  requiredTech: null,
  upgradesTo: null,
  abilities: ['ignore_terrain_cost'],
} as const;

export const SPEARMAN: UnitDef = {
  id: 'spearman',
  name: 'Spearman',
  age: 'antiquity',
  category: 'melee',
  cost: 60,
  combat: 25,
  rangedCombat: 0,
  range: 0,
  movement: 2,
  sightRange: 2,
  requiredTech: 'bronze_working',
  upgradesTo: 'pikeman',
  abilities: ['anti_cavalry'],
} as const;

export const CHARIOT: UnitDef = {
  id: 'chariot',
  name: 'War Chariot',
  age: 'antiquity',
  category: 'cavalry',
  cost: 60,
  combat: 25,
  rangedCombat: 0,
  range: 0,
  movement: 3,
  sightRange: 2,
  requiredTech: 'wheel',
  requiredResource: 'horses',
  upgradesTo: 'horseman',
  abilities: [],
} as const;

export const SETTLER: UnitDef = {
  id: 'settler',
  name: 'Settler',
  age: 'antiquity',
  category: 'civilian',
  cost: 50,
  combat: 0,
  rangedCombat: 0,
  range: 0,
  movement: 3,
  sightRange: 2,
  requiredTech: null,
  upgradesTo: null,
  abilities: ['found_city'],
} as const;

export const BATTERING_RAM: UnitDef = {
  id: 'battering_ram',
  name: 'Battering Ram',
  age: 'antiquity',
  category: 'siege',
  cost: 65,
  combat: 12,
  rangedCombat: 0,
  range: 0,
  movement: 2,
  sightRange: 2,
  requiredTech: 'masonry',
  upgradesTo: 'siege_tower',
  abilities: ['bonus_vs_walls'],
} as const;

export const GALLEY: UnitDef = {
  id: 'galley',
  name: 'Galley',
  age: 'antiquity',
  category: 'naval',
  cost: 60,
  combat: 25,
  rangedCombat: 0,
  range: 0,
  movement: 3,
  sightRange: 2,
  requiredTech: 'sailing',
  upgradesTo: 'caravel',
  abilities: [],
} as const;

export const MERCHANT: UnitDef = {
  id: 'merchant',
  name: 'Merchant',
  age: 'antiquity',
  category: 'civilian',
  cost: 60,
  combat: 0,
  rangedCombat: 0,
  range: 0,
  movement: 3,
  sightRange: 2,
  requiredTech: 'currency',
  upgradesTo: null,
  abilities: ['create_trade_route'],
} as const;

/**
 * Caravan — stationary land trade unit spawned when a Merchant arrives at its
 * destination city (F-03). Plunder-targetable. Cannot move or attack.
 * Linked to a TradeRoute via the route's caravanUnitId field.
 */
export const CARAVAN: UnitDef = {
  id: 'caravan',
  name: 'Caravan',
  age: 'antiquity',
  category: 'civilian',
  cost: 0,        // never produced directly — spawned by tradeSystem
  combat: 0,
  rangedCombat: 0,
  range: 0,
  movement: 0,    // stationary
  sightRange: 1,
  requiredTech: null,
  upgradesTo: null,
  abilities: ['trade_route_anchor'],
} as const;

/**
 * Trade Ship — sea-route variant of Caravan (F-03). Stationary, water-capable,
 * plunder-targetable. Spawned when a Merchant founds a sea trade route.
 */
export const TRADE_SHIP: UnitDef = {
  id: 'trade_ship',
  name: 'Trade Ship',
  age: 'antiquity',
  category: 'naval',
  cost: 0,        // never produced directly — spawned by tradeSystem
  combat: 0,
  rangedCombat: 0,
  range: 0,
  movement: 0,    // stationary
  sightRange: 1,
  requiredTech: null,
  upgradesTo: null,
  abilities: ['trade_route_anchor'],
} as const;

/**
 * F-11: Hephaestion — Alexander's trusted companion and named commander.
 * Granted via GRANT_UNIT effect on Alexander's leader ability at game start.
 * Stronger than a regular warrior; acts as a commander unit.
 */
export const HEPHAESTION: UnitDef = {
  id: 'hephaestion',
  name: 'Hephaestion',
  age: 'antiquity',
  category: 'cavalry',
  cost: 0,          // never produced — granted by leader ability
  combat: 30,
  rangedCombat: 0,
  range: 0,
  movement: 4,
  sightRange: 3,
  requiredTech: null,
  upgradesTo: null,
  abilities: ['commander'],
  leaderId: 'alexander',
  isNamedCommander: true,
} as const;

// ── CC3.1 — Antiquity civilization unique units ────────────────────────────

/** Greece unique unit. Replaces Phalanx; +3 combat vs cavalry (anti_cavalry_elite). */
export const HOPLITE: UnitDef = {
  id: 'hoplite',
  name: 'Hoplite',
  age: 'antiquity',
  category: 'melee',
  cost: 80,
  combat: 31,
  rangedCombat: 0,
  range: 0,
  movement: 2,
  sightRange: 2,
  requiredTech: 'bronze_working',
  upgradesTo: 'pikeman',
  abilities: ['anti_cavalry', 'formation', 'anti_cavalry_elite'],
} as const;

/** Persia unique unit. Replaces Archer; gains +2 movement over base Archer. */
export const IMMORTAL: UnitDef = {
  id: 'immortal',
  name: 'Immortal',
  age: 'antiquity',
  category: 'ranged',
  cost: 60,
  combat: 12,
  rangedCombat: 22,
  range: 2,
  movement: 4,
  sightRange: 2,
  requiredTech: 'bronze_working',
  upgradesTo: 'crossbowman',
  abilities: ['quick_march'],
} as const;

/** Egypt unique unit. Antiquity cavalry with ranged capability; faster than Chariot. */
export const MARYANNU_CHARIOT: UnitDef = {
  id: 'maryannu_chariot',
  name: 'Maryannu Chariot Archer',
  age: 'antiquity',
  category: 'cavalry',
  cost: 70,
  combat: 22,
  rangedCombat: 18,
  range: 1,
  movement: 5,
  sightRange: 2,
  requiredTech: 'wheel',
  requiredResource: 'horses',
  upgradesTo: 'horseman',
  abilities: ['ranged_cavalry'],
} as const;

export const ALL_ANTIQUITY_UNITS: ReadonlyArray<UnitDef> = [
  WARRIOR,
  SLINGER,
  ARCHER,
  SCOUT,
  SPEARMAN,
  CHARIOT,
  SETTLER,
  BATTERING_RAM,
  GALLEY,
  MERCHANT,
  BALLISTA,
  PHALANX,
  ANTIQUITY_HORSEMAN,
  CARAVAN,
  TRADE_SHIP,
  HEPHAESTION,
  HOPLITE,
  IMMORTAL,
  MARYANNU_CHARIOT,
] as const;
