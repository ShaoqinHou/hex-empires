import type { CivicDef } from '../types';

export const CODE_OF_LAWS: CivicDef = {
  id: 'code_of_laws',
  name: 'Code of Laws',
  age: 'antiquity',
  cost: 25,
  prerequisites: [],
  unlocks: ['monument'],
  description: 'Establishes foundational governance. Unlocks Monument.',
  treePosition: { row: 0, col: 0 },
};

export const CRAFTSMANSHIP: CivicDef = {
  id: 'craftsmanship',
  name: 'Craftsmanship',
  age: 'antiquity',
  cost: 40,
  prerequisites: ['code_of_laws'],
  unlocks: [],
  description: '+1 production from improved tiles',
  treePosition: { row: 0, col: 1 },
};

export const FOREIGN_TRADE: CivicDef = {
  id: 'foreign_trade',
  name: 'Foreign Trade',
  age: 'antiquity',
  cost: 40,
  prerequisites: [],
  unlocks: [],
  description: '+1 gold from trade routes',
  treePosition: { row: 2, col: 0 },
};

export const EARLY_EMPIRE: CivicDef = {
  id: 'early_empire',
  name: 'Early Empire',
  age: 'antiquity',
  cost: 60,
  prerequisites: ['code_of_laws'],
  unlocks: [],
  description: '+1 settlement cap',
  treePosition: { row: 0, col: 2 },
};

export const MYSTICISM: CivicDef = {
  id: 'mysticism',
  name: 'Mysticism',
  age: 'antiquity',
  cost: 60,
  prerequisites: ['foreign_trade'],
  unlocks: ['shrine'],
  description: 'Enables Shrines for faith generation',
  treePosition: { row: 2, col: 1 },
};

export const STATE_WORKFORCE: CivicDef = {
  id: 'state_workforce',
  name: 'State Workforce',
  age: 'antiquity',
  cost: 80,
  prerequisites: ['craftsmanship'],
  unlocks: ['walls'],
  description: 'Organizes labor for construction. Unlocks Walls.',
  treePosition: { row: 0, col: 3 },
};

export const MILITARY_TRADITION: CivicDef = {
  id: 'military_tradition',
  name: 'Military Tradition',
  age: 'antiquity',
  cost: 80,
  prerequisites: ['early_empire'],
  unlocks: [],
  description: '+25% combat XP gain',
  treePosition: { row: 1, col: 3 },
};

export const RECORDED_HISTORY: CivicDef = {
  id: 'recorded_history',
  name: 'Recorded History',
  age: 'antiquity',
  cost: 100,
  prerequisites: ['state_workforce'],
  unlocks: [],
  description: 'Enables libraries bonus: +1 science per 2 citizens',
  treePosition: { row: 0, col: 4 },
};

export const ALL_ANTIQUITY_CIVICS: ReadonlyArray<CivicDef> = [
  CODE_OF_LAWS, CRAFTSMANSHIP, FOREIGN_TRADE, EARLY_EMPIRE,
  MYSTICISM, STATE_WORKFORCE, MILITARY_TRADITION, RECORDED_HISTORY,
];
