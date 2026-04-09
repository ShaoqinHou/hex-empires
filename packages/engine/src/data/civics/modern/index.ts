import type { CivicDef } from '../types';

export const IDEOLOGY: CivicDef = {
  id: 'ideology',
  name: 'Ideology',
  age: 'modern',
  cost: 400,
  prerequisites: [],
  unlocks: [],
  description: '+3 culture from broadcast towers',
  treePosition: { row: 0, col: 0 },
};

export const SUFFRAGE: CivicDef = {
  id: 'suffrage',
  name: 'Suffrage',
  age: 'modern',
  cost: 400,
  prerequisites: [],
  unlocks: [],
  description: '+2 happiness per city',
  treePosition: { row: 2, col: 0 },
};

export const TOTALITARIANISM: CivicDef = {
  id: 'totalitarianism',
  name: 'Totalitarianism',
  age: 'modern',
  cost: 500,
  prerequisites: ['ideology'],
  unlocks: [],
  description: '+10 combat strength, -2 happiness',
  treePosition: { row: 0, col: 1 },
};

export const ENVIRONMENTALISM: CivicDef = {
  id: 'environmentalism',
  name: 'Environmentalism',
  age: 'modern',
  cost: 500,
  prerequisites: ['suffrage'],
  unlocks: [],
  description: '+2 food per farm',
  treePosition: { row: 2, col: 1 },
};

export const GLOBALIZATION: CivicDef = {
  id: 'globalization',
  name: 'Globalization',
  age: 'modern',
  cost: 600,
  prerequisites: ['environmentalism'],
  unlocks: [],
  description: '+4 gold from trade routes',
  treePosition: { row: 1, col: 2 },
};

export const FUTURE_CIVIC: CivicDef = {
  id: 'future_civic',
  name: 'Future Civic',
  age: 'modern',
  cost: 700,
  prerequisites: ['globalization'],
  unlocks: [],
  description: '+10 age progress, repeatable',
  treePosition: { row: 1, col: 3 },
};

export const ALL_MODERN_CIVICS: ReadonlyArray<CivicDef> = [
  IDEOLOGY, SUFFRAGE, TOTALITARIANISM,
  ENVIRONMENTALISM, GLOBALIZATION, FUTURE_CIVIC,
];
