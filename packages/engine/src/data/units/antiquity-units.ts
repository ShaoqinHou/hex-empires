export interface UnitDef {
  readonly id: string;
  readonly name: string;
  readonly age: 'antiquity' | 'exploration' | 'modern';
  readonly category: 'melee' | 'ranged' | 'siege' | 'cavalry' | 'naval' | 'civilian' | 'religious';
  readonly cost: number;       // production cost
  readonly combat: number;     // melee combat strength
  readonly rangedCombat: number; // ranged combat strength (0 = melee only)
  readonly range: number;      // attack range (0 = melee)
  readonly movement: number;   // base movement points
  readonly sightRange: number; // fog of war visibility radius (default 2)
  readonly requiredTech: string | null;
  readonly upgradesTo: string | null;
  readonly abilities: ReadonlyArray<string>;
}

export const WARRIOR: UnitDef = {
  id: 'warrior',
  name: 'Warrior',
  age: 'antiquity',
  category: 'melee',
  cost: 40,
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
  cost: 35,
  combat: 5,
  rangedCombat: 15,
  range: 1,
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
  cost: 60,
  combat: 10,
  rangedCombat: 25,
  range: 2,
  movement: 2,
  sightRange: 2,
  requiredTech: 'archery',
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
  movement: 3,
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
  cost: 65,
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
  cost: 55,
  combat: 25,
  rangedCombat: 0,
  range: 0,
  movement: 3,
  sightRange: 2,
  requiredTech: 'wheel',
  upgradesTo: 'horseman',
  abilities: [],
} as const;

export const SETTLER: UnitDef = {
  id: 'settler',
  name: 'Settler',
  age: 'antiquity',
  category: 'civilian',
  cost: 80,
  combat: 0,
  rangedCombat: 0,
  range: 0,
  movement: 2,
  sightRange: 2,
  requiredTech: null,
  upgradesTo: null,
  abilities: ['found_city'],
} as const;

export const BUILDER: UnitDef = {
  id: 'builder',
  name: 'Builder',
  age: 'antiquity',
  category: 'civilian',
  cost: 50,
  combat: 0,
  rangedCombat: 0,
  range: 0,
  movement: 2,
  sightRange: 2,
  requiredTech: null,
  upgradesTo: null,
  abilities: ['build_improvement'],
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
  cost: 65,
  combat: 25,
  rangedCombat: 0,
  range: 0,
  movement: 3,
  sightRange: 2,
  requiredTech: 'sailing',
  upgradesTo: 'caravel',
  abilities: [],
} as const;

export const ALL_ANTIQUITY_UNITS: ReadonlyArray<UnitDef> = [
  WARRIOR,
  SLINGER,
  ARCHER,
  SCOUT,
  SPEARMAN,
  CHARIOT,
  SETTLER,
  BUILDER,
  BATTERING_RAM,
  GALLEY,
] as const;
