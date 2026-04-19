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

/**
 * Rulebook §12 (Military Victory) — Adopting an Ideology requires the
 * Political Theory civic. Foundation piece of the Modern civic tree.
 */
export const POLITICAL_THEORY: CivicDef = {
  id: 'political_theory',
  name: 'Political Theory',
  age: 'modern',
  cost: 350,
  prerequisites: [],
  // TODO(content): add unlocks: ['adopt_ideology'] when ideology adoption mechanic id is defined
  unlocks: [],
  description:
    'Systematic study of the legitimacy and structure of the state. Required to adopt an Ideology.',
  treePosition: { row: 1, col: 0 },
};

/**
 * Rulebook §14.1.3 — unlocks the Democracy Government for the Modern Age.
 * Intellectual successor to Political Theory.
 */
export const ENLIGHTENMENT: CivicDef = {
  id: 'enlightenment',
  name: 'Enlightenment',
  age: 'modern',
  cost: 450,
  prerequisites: ['political_theory'],
  unlocks: ['elective_republic'],
  description:
    'Liberty, reason, and the consent of the governed. Unlocks the Elective Republic government.',
  treePosition: { row: 1, col: 1 },
};

/**
 * Rulebook §14.1.3 — unlocks the Communism Government for the Modern Age.
 * Mass-mobilisation branch that parallels Totalitarianism.
 */
export const CLASS_STRUGGLE: CivicDef = {
  id: 'class_struggle',
  name: 'Class Struggle',
  age: 'modern',
  cost: 550,
  prerequisites: ['political_theory'],
  // TODO(content): add unlocks: ['communism'] when Communism GovernmentDef is defined
  unlocks: [],
  description:
    'Organises society along the axis of productive labour versus capital. Unlocks the Communism government when defined.',
  treePosition: { row: 2, col: 2 },
};

export const ALL_MODERN_CIVICS: ReadonlyArray<CivicDef> = [
  IDEOLOGY, SUFFRAGE, TOTALITARIANISM,
  ENVIRONMENTALISM, GLOBALIZATION, FUTURE_CIVIC,
  POLITICAL_THEORY, ENLIGHTENMENT, CLASS_STRUGGLE,
];
