import type { TechnologyDef } from '../types';

export const CARTOGRAPHY: TechnologyDef = {
  id: 'cartography',
  name: 'Cartography',
  age: 'exploration',
  cost: 200,
  prerequisites: [],
  unlocks: ['caravel'],
  description: 'Enables Caravel naval unit',
  treePosition: { row: 3, col: 0 },
};

export const GUNPOWDER: TechnologyDef = {
  id: 'gunpowder',
  name: 'Gunpowder',
  age: 'exploration',
  cost: 250,
  prerequisites: [],
  unlocks: ['musketman'],
  description: 'Enables Musketman unit',
  treePosition: { row: 2, col: 0 },
};

export const PRINTING: TechnologyDef = {
  id: 'printing',
  name: 'Printing',
  age: 'exploration',
  cost: 200,
  prerequisites: [],
  unlocks: [],
  description: 'Bonus science from libraries',
  treePosition: { row: 0, col: 0 },
};

export const BANKING: TechnologyDef = {
  id: 'banking',
  name: 'Banking',
  age: 'exploration',
  cost: 250,
  prerequisites: ['printing'],
  unlocks: ['bank'],
  description: 'Enables Bank building',
  treePosition: { row: 0, col: 1 },
};

export const ASTRONOMY: TechnologyDef = {
  id: 'astronomy',
  name: 'Astronomy',
  age: 'exploration',
  cost: 300,
  prerequisites: ['cartography'],
  unlocks: [],
  description: 'Ocean crossing enabled',
  treePosition: { row: 3, col: 1 },
};

export const METALLURGY: TechnologyDef = {
  id: 'metallurgy',
  name: 'Metallurgy',
  age: 'exploration',
  cost: 300,
  prerequisites: ['gunpowder'],
  unlocks: ['bombard'],
  description: 'Enables Bombard siege unit',
  treePosition: { row: 2, col: 1 },
};

export const EDUCATION: TechnologyDef = {
  id: 'education',
  name: 'Education',
  age: 'exploration',
  cost: 300,
  prerequisites: ['printing'],
  unlocks: ['university'],
  description: 'Enables University building',
  treePosition: { row: 0, col: 2 },
};

export const MILITARY_TACTICS: TechnologyDef = {
  id: 'military_tactics',
  name: 'Military Tactics',
  age: 'exploration',
  cost: 350,
  prerequisites: ['metallurgy'],
  unlocks: ['knight'],
  description: 'Enables Knight cavalry unit',
  treePosition: { row: 1, col: 2 },
};

export const ECONOMICS: TechnologyDef = {
  id: 'economics',
  name: 'Economics',
  age: 'exploration',
  cost: 400,
  prerequisites: ['banking', 'education'],
  unlocks: ['stock_exchange'],
  description: 'Enables Stock Exchange',
  treePosition: { row: 0, col: 3 },
};

export const SIEGE_TACTICS: TechnologyDef = {
  id: 'siege_tactics',
  name: 'Siege Tactics',
  age: 'exploration',
  cost: 400,
  prerequisites: ['metallurgy'],
  unlocks: ['cannon'],
  description: 'Enables Cannon unit',
  treePosition: { row: 2, col: 3 },
};

export const ALL_EXPLORATION_TECHS: ReadonlyArray<TechnologyDef> = [
  CARTOGRAPHY, GUNPOWDER, PRINTING, BANKING, ASTRONOMY,
  METALLURGY, EDUCATION, MILITARY_TACTICS, ECONOMICS, SIEGE_TACTICS,
];
