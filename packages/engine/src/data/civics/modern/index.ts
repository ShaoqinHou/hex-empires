import type { CivicDef } from '../types';

// ── Ideology branches (W2-03 CT F-08) ──
// Branch assignment:
//   fascism:   IDEOLOGY, TOTALITARIANISM
//   democracy: SUFFRAGE, ENVIRONMENTALISM, GLOBALIZATION, FUTURE_CIVIC
//   communism: CLASS_STRUGGLE
// Gate civics: POLITICAL_THEORY, ENLIGHTENMENT — no branch (available to all)

export const IDEOLOGY: CivicDef = {
  id: 'ideology',
  name: 'Ideology',
  age: 'modern',
  cost: 400,
  prerequisites: [],
  unlocks: [],
  description: '+3 culture from broadcast towers',
  treePosition: { row: 0, col: 0 },
  ideologyBranch: 'fascism',
  masteryUnlocks: [{ type: 'MODIFY_YIELD', target: 'empire', yield: 'culture', value: 3 }],
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
  ideologyBranch: 'democracy',
  masteryUnlocks: [{ type: 'MODIFY_YIELD', target: 'empire', yield: 'food', value: 2 }],
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
  ideologyBranch: 'fascism',
  effects: [{ type: 'GRANT_POLICY_SLOT', slotType: 'military' }],
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
  ideologyBranch: 'democracy',
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
  ideologyBranch: 'democracy',
  effects: [{ type: 'GRANT_POLICY_SLOT', slotType: 'economic' }],
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
  ideologyBranch: 'democracy',
};

/**
 * Rulebook §12 (Military Victory) — Adopting an Ideology requires the
 * Political Theory civic. Foundation piece of the Modern civic tree.
 * No ideologyBranch — available to all players before ideology selection.
 */
export const POLITICAL_THEORY: CivicDef = {
  id: 'political_theory',
  name: 'Political Theory',
  age: 'modern',
  cost: 350,
  prerequisites: [],
  unlocks: [],
  description:
    'Systematic study of the legitimacy and structure of the state. Required to adopt an Ideology.',
  treePosition: { row: 1, col: 0 },
};

/**
 * Rulebook §14.1.3 — unlocks the Democracy Government for the Modern Age.
 * Intellectual successor to Political Theory.
 * No ideologyBranch — available to all players (gate civic).
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
  masteryUnlocks: [{ type: 'MODIFY_YIELD', target: 'empire', yield: 'science', value: 3 }],
  effects: [{ type: 'GRANT_POLICY_SLOT', slotType: 'diplomatic' }],
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
  unlocks: [],
  description:
    'Organises society along the axis of productive labour versus capital. Unlocks the Communism government when defined.',
  treePosition: { row: 2, col: 2 },
  ideologyBranch: 'communism',
  effects: [{ type: 'GRANT_POLICY_SLOT', slotType: 'wildcard' }],
};

export const ALL_MODERN_CIVICS: ReadonlyArray<CivicDef> = [
  IDEOLOGY, SUFFRAGE, TOTALITARIANISM,
  ENVIRONMENTALISM, GLOBALIZATION, FUTURE_CIVIC,
  POLITICAL_THEORY, ENLIGHTENMENT, CLASS_STRUGGLE,
];
