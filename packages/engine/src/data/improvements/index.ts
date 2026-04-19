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

export const ALL_IMPROVEMENTS: ReadonlyArray<ImprovementDef> = [
  FARM,
  MINE,
  PASTURE,
  PLANTATION,
  QUARRY,
  CAMP,
] as const;
