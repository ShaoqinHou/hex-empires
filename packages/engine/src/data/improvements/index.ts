import type { ImprovementDef } from '../../types/Improvement';

export const FARM: ImprovementDef = {
  id: 'farm',
  name: 'Farm',
  category: 'basic',
  requiredTech: null,
  prerequisites: {
    terrain: ['plains', 'grassland'],
  },
  yields: { food: 1 },
  modifier: {},
} as const;

export const MINE: ImprovementDef = {
  id: 'mine',
  name: 'Mine',
  category: 'resource',
  requiredTech: 'mining',
  prerequisites: {
    terrain: ['plains', 'hills', 'mountains', 'desert', 'tundra'],
    resource: ['iron', 'copper', 'gold', 'silver', 'gems'],
  },
  yields: { production: 1 },
  modifier: { defense: 0.25 },
} as const;

export const PASTURE: ImprovementDef = {
  id: 'pasture',
  name: 'Pasture',
  category: 'resource',
  requiredTech: 'animal_husbandry',
  prerequisites: {
    resource: ['cattle', 'horses', 'sheep'],
  },
  yields: { food: 1, production: 1 },
  modifier: {},
} as const;

export const PLANTATION: ImprovementDef = {
  id: 'plantation',
  name: 'Plantation',
  category: 'resource',
  requiredTech: null,
  prerequisites: {
    terrain: ['plains', 'grassland'],
    feature: ['forest', 'rainforest'],
    resource: ['cotton', 'sugar', 'spices', 'coffee', 'tea'],
  },
  yields: { gold: 1 },
  modifier: {},
} as const;

export const QUARRY: ImprovementDef = {
  id: 'quarry',
  name: 'Quarry',
  category: 'resource',
  requiredTech: null,
  prerequisites: {
    terrain: ['plains', 'desert', 'tundra'],
    resource: ['marble', 'stone'],
  },
  yields: { production: 1 },
  modifier: { defense: 0.5 },
} as const;

export const CAMP: ImprovementDef = {
  id: 'camp',
  name: 'Camp',
  category: 'resource',
  requiredTech: null,
  prerequisites: {
    feature: ['forest', 'rainforest'],
    resource: ['deer', 'furs', 'ivory', 'truffles'],
  },
  yields: { food: 1, gold: 1 },
  modifier: {},
} as const;

// ── Civ-unique rural improvements ──

export const BARAY: ImprovementDef = {
  id: 'baray',
  name: 'Baray',
  category: 'basic',
  requiredTech: null,
  prerequisites: {
    terrain: ['grassland', 'plains'],
  },
  yields: { food: 2, faith: 1 },
  modifier: {},
  ageless: true,
  civId: 'khmer',
} as const;

export const GREAT_WALL: ImprovementDef = {
  id: 'great_wall',
  name: 'Great Wall',
  category: 'infrastructure',
  requiredTech: null,
  prerequisites: {
    terrain: ['plains', 'hills', 'desert'],
  },
  yields: { gold: 1, culture: 1 },
  modifier: { defense: 0.5 },
  ageless: true,
  civId: 'china',
} as const;

export const PAIRIDAEZA: ImprovementDef = {
  id: 'pairidaeza',
  name: 'Pairidaeza',
  category: 'basic',
  requiredTech: null,
  prerequisites: {
    terrain: ['plains', 'grassland', 'desert'],
  },
  yields: { culture: 1, gold: 1 },
  modifier: {},
  ageless: true,
  civId: 'persia',
} as const;

export const POTKOP: ImprovementDef = {
  id: 'potkop',
  name: 'Potkop',
  category: 'basic',
  requiredTech: null,
  prerequisites: {
    terrain: ['plains', 'grassland'],
  },
  yields: { food: 1, production: 1 },
  modifier: {},
  ageless: true,
  civId: 'mississippian',
} as const;

export const TERRACE_FARM: ImprovementDef = {
  id: 'terrace_farm',
  name: 'Terrace Farm',
  category: 'basic',
  requiredTech: null,
  prerequisites: {
    terrain: ['hills', 'mountains'],
  },
  yields: { food: 2, production: 1 },
  modifier: {},
  ageless: true,
  civId: 'inca',
} as const;

export const SEOWON: ImprovementDef = {
  id: 'seowon',
  name: 'Seowon',
  category: 'basic',
  requiredTech: 'writing',
  prerequisites: {
    terrain: ['hills', 'plains', 'grassland'],
  },
  yields: { science: 3 },
  modifier: {},
  ageless: true,
  civId: 'korea',
} as const;

export const FEITORIA: ImprovementDef = {
  id: 'feitoria',
  name: 'Feitoria',
  category: 'infrastructure',
  requiredTech: 'cartography',
  prerequisites: {
    terrain: ['plains', 'grassland', 'desert'],
  },
  yields: { gold: 3 },
  modifier: {},
  ageless: true,
  civId: 'portugal',
} as const;

export const OPEN_AIR_MUSEUM: ImprovementDef = {
  id: 'open_air_museum',
  name: 'Open Air Museum',
  category: 'basic',
  requiredTech: 'flight',
  prerequisites: {
    terrain: ['grassland', 'plains', 'tundra'],
  },
  yields: { culture: 3 },
  modifier: {},
  ageless: true,
  civId: 'sweden',
} as const;

export const OUTBACK_STATION: ImprovementDef = {
  id: 'outback_station',
  name: 'Outback Station',
  category: 'basic',
  requiredTech: 'steam_power',
  prerequisites: {
    terrain: ['desert', 'plains', 'grassland'],
  },
  yields: { food: 2, production: 1 },
  modifier: {},
  ageless: true,
  civId: 'australia',
} as const;

export const ALL_IMPROVEMENTS: ReadonlyArray<ImprovementDef> = [
  FARM,
  MINE,
  PASTURE,
  PLANTATION,
  QUARRY,
  CAMP,
  BARAY,
  GREAT_WALL,
  PAIRIDAEZA,
  POTKOP,
  TERRACE_FARM,
  SEOWON,
  FEITORIA,
  OPEN_AIR_MUSEUM,
  OUTBACK_STATION,
] as const;
