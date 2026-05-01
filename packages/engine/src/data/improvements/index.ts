import type { ImprovementDef } from '../../types/Improvement';

export const FARM: ImprovementDef = {
  id: 'farm',
  name: 'Farm',
  category: 'basic',
  requiredTech: null,
  prerequisites: {
    terrain: ['plains', 'grassland', 'tropical'],
  },
  yields: { food: 1 },
  modifier: {},
  isAgeless: true,
} as const;

export const MINE: ImprovementDef = {
  id: 'mine',
  name: 'Mine',
  category: 'resource',
  requiredTech: 'mining',
  prerequisites: {
    terrain: ['plains', 'desert', 'tundra'],
    feature: ['hills', 'mountains'],
    resource: ['iron', 'copper', 'gold', 'silver', 'gems'],
  },
  yields: { production: 1 },
  modifier: { defense: 0.25 },
  isAgeless: true,
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
  isAgeless: true,
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
  isAgeless: false,  // era-dependent (colonial economy)
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
  isAgeless: true,
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
  isAgeless: true,
} as const;

export const WOODCUTTER: ImprovementDef = {
  id: 'woodcutter',
  name: 'Woodcutter',
  category: 'resource',
  requiredTech: null,
  prerequisites: {
    feature: ['forest', 'jungle', 'rainforest'],
  },
  yields: { production: 1 },
  modifier: {},
  isAgeless: true,
} as const;

export const CLAY_PIT: ImprovementDef = {
  id: 'clay_pit',
  name: 'Clay Pit',
  category: 'resource',
  requiredTech: null,
  prerequisites: {
    feature: ['marsh', 'mangrove'],
  },
  yields: { production: 1 },
  modifier: {},
  isAgeless: true,
} as const;

export const FISHING_BOATS: ImprovementDef = {
  id: 'fishing_boats',
  name: 'Fishing Boats',
  category: 'resource',
  requiredTech: null,
  prerequisites: {
    terrain: ['coast', 'ocean', 'lake'],
  },
  yields: { food: 1 },
  modifier: {},
  isAgeless: true,
} as const;

export const OIL_RIG: ImprovementDef = {
  id: 'oil_rig',
  name: 'Oil Rig',
  category: 'resource',
  requiredTech: null,
  prerequisites: {
    terrain: ['ocean', 'coast'],
  },
  yields: { production: 2 },
  modifier: {},
  isAgeless: true,
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
  isAgeless: true,
  civId: 'khmer',
} as const;

export const GREAT_WALL: ImprovementDef = {
  id: 'great_wall',
  name: 'Great Wall',
  category: 'infrastructure',
  requiredTech: null,
  prerequisites: {
    terrain: ['plains', 'desert'],
    feature: ['hills'],
  },
  yields: { gold: 1, culture: 1 },
  modifier: { defense: 0.5 },
  isAgeless: true,
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
  isAgeless: true,
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
  isAgeless: true,
  civId: 'mississippian',
} as const;

export const TERRACE_FARM: ImprovementDef = {
  id: 'terrace_farm',
  name: 'Terrace Farm',
  category: 'basic',
  requiredTech: null,
  prerequisites: {
    feature: ['hills', 'mountains'],
  },
  yields: { food: 2, production: 1 },
  modifier: {},
  isAgeless: true,
  civId: 'inca',
} as const;

export const SEOWON: ImprovementDef = {
  id: 'seowon',
  name: 'Seowon',
  category: 'basic',
  requiredTech: 'writing',
  prerequisites: {
    terrain: ['plains', 'grassland'],
    feature: ['hills'],
  },
  yields: { science: 3 },
  modifier: {},
  isAgeless: true,
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
  isAgeless: true,
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
  isAgeless: true,
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
  isAgeless: true,
  civId: 'australia',
} as const;

export const ALL_IMPROVEMENTS: ReadonlyArray<ImprovementDef> = [
  FARM,
  MINE,
  PASTURE,
  PLANTATION,
  QUARRY,
  CAMP,
  WOODCUTTER,
  CLAY_PIT,
  FISHING_BOATS,
  OIL_RIG,
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
