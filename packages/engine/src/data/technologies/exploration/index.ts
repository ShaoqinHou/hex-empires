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

export const APPRENTICESHIP: TechnologyDef = {
  id: 'apprenticeship',
  name: 'Apprenticeship',
  age: 'exploration',
  cost: 250,
  prerequisites: ['printing'],
  unlocks: ['workshop_exp'],
  description: 'Enables Workshop building',
  treePosition: { row: 1, col: 1 },
};

export const MILITARY_SCIENCE: TechnologyDef = {
  id: 'military_science',
  name: 'Military Science',
  age: 'exploration',
  cost: 450,
  prerequisites: ['military_tactics', 'education'],
  unlocks: ['barracks_exp'],
  description: 'Enables Barracks building',
  treePosition: { row: 1, col: 3 },
};

export const MACHINERY: TechnologyDef = {
  id: 'machinery',
  name: 'Machinery',
  age: 'exploration',
  cost: 220,
  prerequisites: [],
  unlocks: ['catapult', 'gristmill', 'sawmill'],
  description: 'Enables Catapult siege unit, Gristmill and Sawmill buildings',
  treePosition: { row: 4, col: 0 },
};

export const CASTLES: TechnologyDef = {
  id: 'castles',
  name: 'Castles',
  age: 'exploration',
  cost: 260,
  prerequisites: ['feudalism'],
  unlocks: ['crossbowman', 'dungeon'],
  description: 'Enables Crossbowman ranged unit and Dungeon building',
  treePosition: { row: 5, col: 1 },
};

export const FEUDALISM: TechnologyDef = {
  id: 'feudalism',
  name: 'Feudalism',
  age: 'exploration',
  cost: 240,
  prerequisites: [],
  unlocks: ['inn'],
  description: 'Enables Inn building and medieval infrastructure',
  treePosition: { row: 5, col: 0 },
};

export const GUILDS: TechnologyDef = {
  id: 'guilds',
  name: 'Guilds',
  age: 'exploration',
  cost: 300,
  prerequisites: ['apprenticeship'],
  unlocks: ['guildhall'],
  description: 'Enables Guildhall building for merchant networks',
  treePosition: { row: 1, col: 2 },
};

export const SHIPBUILDING: TechnologyDef = {
  id: 'shipbuilding',
  name: 'Shipbuilding',
  age: 'exploration',
  cost: 280,
  prerequisites: ['cartography'],
  unlocks: ['shipyard'],
  description: 'Enables Shipyard for naval production',
  treePosition: { row: 3, col: 2 },
};

export const METAL_CASTING: TechnologyDef = {
  id: 'metal_casting',
  name: 'Metal Casting',
  age: 'exploration',
  cost: 320,
  prerequisites: ['metallurgy'],
  unlocks: ['pikeman', 'lancer'],
  description: 'Enables Pikeman anti-cavalry infantry and Lancer cavalry',
  treePosition: { row: 2, col: 2 },
};

export const ALL_EXPLORATION_TECHS: ReadonlyArray<TechnologyDef> = [
  PRINTING, APPRENTICESHIP, GUNPOWDER, BANKING,
  EDUCATION, ASTRONOMY, MILITARY_TACTICS, METALLURGY,
  CARTOGRAPHY, ECONOMICS, MILITARY_SCIENCE, SIEGE_TACTICS,
  MACHINERY, CASTLES, FEUDALISM, GUILDS, SHIPBUILDING, METAL_CASTING,
];
