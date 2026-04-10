import type { UnitDef } from './antiquity-units';

export const INFANTRY: UnitDef = {
  id: 'infantry',
  name: 'Infantry',
  age: 'modern',
  category: 'melee',
  cost: 250,
  combat: 55,
  rangedCombat: 0,
  range: 0,
  movement: 2,
  sightRange: 2,
  requiredTech: 'rifling',
  upgradesTo: null,
  abilities: [],
} as const;

export const MACHINE_GUN: UnitDef = {
  id: 'machine_gun',
  name: 'Machine Gun',
  age: 'modern',
  category: 'ranged',
  cost: 250,
  combat: 45,
  rangedCombat: 60,
  range: 2,
  movement: 2,
  sightRange: 2,
  requiredTech: 'replaceable_parts',
  upgradesTo: null,
  abilities: [],
} as const;

export const TANK: UnitDef = {
  id: 'tank',
  name: 'Tank',
  age: 'modern',
  category: 'cavalry',
  cost: 350,
  combat: 65,
  rangedCombat: 0,
  range: 0,
  movement: 4,
  sightRange: 2,
  requiredTech: 'combined_arms',
  upgradesTo: null,
  abilities: [],
} as const;

export const FIGHTER: UnitDef = {
  id: 'fighter',
  name: 'Fighter',
  age: 'modern',
  category: 'ranged',
  cost: 300,
  combat: 60,
  rangedCombat: 75,
  range: 8,
  movement: 10,
  sightRange: 2,
  requiredTech: 'combined_arms',
  upgradesTo: null,
  abilities: [],
} as const;

export const ROCKET_ARTILLERY: UnitDef = {
  id: 'rocket_artillery',
  name: 'Rocket Artillery',
  age: 'modern',
  category: 'siege',
  cost: 350,
  combat: 20,
  rangedCombat: 85,
  range: 3,
  movement: 2,
  sightRange: 2,
  requiredTech: 'rocketry',
  upgradesTo: null,
  abilities: [],
} as const;

export const IRONCLAD: UnitDef = {
  id: 'ironclad',
  name: 'Ironclad',
  age: 'modern',
  category: 'naval',
  cost: 250,
  combat: 55,
  rangedCombat: 0,
  range: 0,
  movement: 5,
  sightRange: 2,
  requiredTech: 'steam_power',
  requiredResource: 'coal',
  upgradesTo: null,
  abilities: [],
} as const;

export const BIPLANE: UnitDef = {
  id: 'biplane',
  name: 'Biplane',
  age: 'modern',
  category: 'ranged',
  cost: 250,
  combat: 40,
  rangedCombat: 50,
  range: 3,
  movement: 5,
  sightRange: 2,
  requiredTech: 'flight',
  upgradesTo: null,
  abilities: [],
} as const;

export const ALL_MODERN_UNITS: ReadonlyArray<UnitDef> = [
  INFANTRY,
  MACHINE_GUN,
  TANK,
  FIGHTER,
  ROCKET_ARTILLERY,
  IRONCLAD,
  BIPLANE,
] as const;
