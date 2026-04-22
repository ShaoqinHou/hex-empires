import type { CivicDef } from '../types';

export const HUMANISM: CivicDef = {
  id: 'humanism',
  name: 'Humanism',
  age: 'exploration',
  cost: 120,
  prerequisites: [],
  unlocks: [],
  description: '+2 science per academy',
  treePosition: { row: 0, col: 0 },
  masteryUnlocks: [{ type: 'MODIFY_YIELD', target: 'empire', yield: 'science', value: 2 }],
};

export const MERCANTILISM: CivicDef = {
  id: 'mercantilism',
  name: 'Mercantilism',
  age: 'exploration',
  cost: 120,
  prerequisites: [],
  unlocks: [],
  description: '+3 gold from trade routes',
  treePosition: { row: 2, col: 0 },
  masteryUnlocks: [{ type: 'MODIFY_YIELD', target: 'empire', yield: 'gold', value: 2 }],
};

export const DIVINE_RIGHT: CivicDef = {
  id: 'divine_right',
  name: 'Divine Right',
  age: 'exploration',
  cost: 160,
  prerequisites: ['humanism'],
  unlocks: ['cathedral'],
  description: 'Enables cathedrals',
  treePosition: { row: 0, col: 1 },
};

export const EXPLORATION_CIVIC: CivicDef = {
  id: 'exploration_civic',
  name: 'Exploration',
  age: 'exploration',
  cost: 160,
  prerequisites: ['mercantilism'],
  unlocks: [],
  description: '+1 naval movement',
  treePosition: { row: 2, col: 1 },
};

export const REFORMED_CHURCH: CivicDef = {
  id: 'reformed_church',
  name: 'Reformed Church',
  age: 'exploration',
  cost: 200,
  prerequisites: ['divine_right'],
  unlocks: [],
  description: '+2 faith per turn',
  treePosition: { row: 0, col: 2 },
};

export const COLONIALISM: CivicDef = {
  id: 'colonialism',
  name: 'Colonialism',
  age: 'exploration',
  cost: 200,
  prerequisites: ['exploration_civic'],
  unlocks: [],
  description: '+1 settlement cap',
  treePosition: { row: 2, col: 2 },
};

export const CIVIL_ENGINEERING: CivicDef = {
  id: 'civil_engineering',
  name: 'Civil Engineering',
  age: 'exploration',
  cost: 250,
  prerequisites: ['colonialism'],
  unlocks: [],
  description: '+2 production in cities',
  treePosition: { row: 1, col: 3 },
};

export const NATIONALISM: CivicDef = {
  id: 'nationalism',
  name: 'Nationalism',
  age: 'exploration',
  cost: 300,
  prerequisites: ['civil_engineering'],
  unlocks: [],
  description: '+5 combat strength in own territory',
  treePosition: { row: 1, col: 4 },
  masteryUnlocks: [{ type: 'MODIFY_COMBAT', target: 'all', value: 3 }],
};

/**
 * Rulebook §14.1.2 — unlocks the Feudal Monarchy Government for the
 * Exploration Age. Sits on the military / governance branch with
 * Nationalism as a natural successor.
 */
export const FEUDALISM: CivicDef = {
  id: 'feudalism',
  name: 'Feudalism',
  age: 'exploration',
  cost: 140,
  prerequisites: ['humanism'],
  unlocks: ['feudal_monarchy'],
  description:
    'Binds land, loyalty, and service into a hierarchy of lords and vassals. Unlocks the Feudal Monarchy government.',
  treePosition: { row: 1, col: 1 },
};

/**
 * Rulebook §14.1.2 — unlocks the Theocracy Government for the Exploration
 * Age. Follows from Divine Right on the faith branch.
 */
export const SCHOLASTICISM: CivicDef = {
  id: 'scholasticism',
  name: 'Scholasticism',
  age: 'exploration',
  cost: 180,
  prerequisites: ['divine_right'],
  unlocks: ['theocracy'],
  description:
    'Synthesises faith and reason into a unified ecclesiastical doctrine. Unlocks the Theocracy government.',
  treePosition: { row: 0, col: 3 },
};

export const ALL_EXPLORATION_CIVICS: ReadonlyArray<CivicDef> = [
  HUMANISM, MERCANTILISM, DIVINE_RIGHT, EXPLORATION_CIVIC,
  REFORMED_CHURCH, COLONIALISM, CIVIL_ENGINEERING, NATIONALISM,
  FEUDALISM, SCHOLASTICISM,
];
