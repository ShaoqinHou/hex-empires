import type { TechnologyDef } from '../types';

export const POTTERY: TechnologyDef = {
  id: 'pottery',
  name: 'Pottery',
  age: 'antiquity',
  cost: 25,
  prerequisites: [],
  unlocks: ['granary'],
  description: 'Enables Granary building',
  treePosition: { row: 0, col: 0 },
  // No masteryEffect — uses generic +1 science fallback
};

export const ANIMAL_HUSBANDRY: TechnologyDef = {
  id: 'animal_husbandry',
  name: 'Animal Husbandry',
  age: 'antiquity',
  cost: 25,
  prerequisites: [],
  unlocks: [],
  description: 'Reveals horses on the map',
  treePosition: { row: 1, col: 0 },
  masteryEffect: { type: 'MODIFY_YIELD', target: 'empire', yield: 'food', value: 1 },
  masteryCodexCount: 0,
};

export const MINING: TechnologyDef = {
  id: 'mining',
  name: 'Mining',
  age: 'antiquity',
  cost: 25,
  prerequisites: [],
  unlocks: [],
  description: 'Enables mine improvements',
  treePosition: { row: 2, col: 0 },
  masteryEffect: { type: 'MODIFY_YIELD', target: 'empire', yield: 'production', value: 1 },
  masteryCodexCount: 0,
};

export const SAILING: TechnologyDef = {
  id: 'sailing',
  name: 'Sailing',
  age: 'antiquity',
  cost: 50,
  prerequisites: [],
  unlocks: ['galley'],
  description: 'Enables naval units',
  treePosition: { row: 3, col: 0 },
  masteryEffect: { type: 'MODIFY_MOVEMENT', target: 'naval', value: 1 },
  masteryCodexCount: 1,
};

export const ARCHERY: TechnologyDef = {
  id: 'archery',
  name: 'Archery',
  age: 'antiquity',
  cost: 50,
  prerequisites: ['animal_husbandry'],
  unlocks: ['archer'],
  description: 'Enables Archer unit',
  treePosition: { row: 1, col: 1 },
  masteryEffect: { type: 'MODIFY_COMBAT', target: 'ranged', value: 3 },
  masteryCodexCount: 0,
};

export const WRITING: TechnologyDef = {
  id: 'writing',
  name: 'Writing',
  age: 'antiquity',
  cost: 50,
  prerequisites: ['pottery'],
  unlocks: ['library'],
  description: 'Enables Library building',
  treePosition: { row: 0, col: 1 },
  masteryEffect: { type: 'MODIFY_YIELD', target: 'empire', yield: 'science', value: 2 },
  masteryCodexCount: 1,
};

export const MASONRY: TechnologyDef = {
  id: 'masonry',
  name: 'Masonry',
  age: 'antiquity',
  cost: 80,
  prerequisites: ['mining'],
  unlocks: ['walls', 'battering_ram'],
  description: 'Enables Ancient Walls and Battering Ram',
  treePosition: { row: 2, col: 1 },
  masteryEffect: { type: 'MODIFY_COMBAT', target: 'all', value: 2 },
  masteryCodexCount: 1,
};

export const BRONZE_WORKING: TechnologyDef = {
  id: 'bronze_working',
  name: 'Bronze Working',
  age: 'antiquity',
  cost: 80,
  prerequisites: ['mining'],
  unlocks: ['spearman', 'barracks'],
  description: 'Enables Spearman and Barracks',
  treePosition: { row: 2, col: 2 },
  masteryEffect: { type: 'MODIFY_COMBAT', target: 'melee', value: 5 },
  masteryCodexCount: 1,
};

export const WHEEL: TechnologyDef = {
  id: 'wheel',
  name: 'Wheel',
  age: 'antiquity',
  cost: 80,
  prerequisites: ['animal_husbandry'],
  unlocks: ['chariot', 'watermill'],
  description: 'Enables War Chariot and Water Mill',
  treePosition: { row: 1, col: 2 },
  masteryEffect: { type: 'MODIFY_MOVEMENT', target: 'cavalry', value: 1 },
  masteryCodexCount: 1,
};

export const IRRIGATION: TechnologyDef = {
  id: 'irrigation',
  name: 'Irrigation',
  age: 'antiquity',
  cost: 50,
  prerequisites: ['pottery'],
  unlocks: [],
  description: 'Enables farm improvements on desert',
  treePosition: { row: 0, col: 2 },
  masteryEffect: { type: 'MODIFY_YIELD', target: 'empire', yield: 'food', value: 2 },
  masteryCodexCount: 1,
};

export const CURRENCY: TechnologyDef = {
  id: 'currency',
  name: 'Currency',
  age: 'antiquity',
  cost: 120,
  prerequisites: ['writing'],
  unlocks: ['market'],
  description: 'Enables Market building',
  treePosition: { row: 0, col: 3 },
  masteryEffect: { type: 'MODIFY_YIELD', target: 'empire', yield: 'gold', value: 3 },
  masteryCodexCount: 2,
};

export const CONSTRUCTION: TechnologyDef = {
  id: 'construction',
  name: 'Construction',
  age: 'antiquity',
  cost: 120,
  prerequisites: ['masonry'],
  unlocks: ['workshop'],
  description: 'Enables Workshop building',
  treePosition: { row: 2, col: 3 },
  masteryEffect: { type: 'MODIFY_YIELD', target: 'empire', yield: 'production', value: 2 },
  masteryCodexCount: 1,
};

export const IRON_WORKING: TechnologyDef = {
  id: 'iron_working',
  name: 'Iron Working',
  age: 'antiquity',
  cost: 150,
  prerequisites: ['bronze_working'],
  unlocks: ['swordsman'],
  description: 'Enables Swordsman unit',
  treePosition: { row: 2, col: 4 },
  masteryEffect: { type: 'MODIFY_COMBAT', target: 'melee', value: 7 },
  masteryCodexCount: 2,
};

export const MATHEMATICS: TechnologyDef = {
  id: 'mathematics',
  name: 'Mathematics',
  age: 'antiquity',
  cost: 150,
  prerequisites: ['currency'],
  unlocks: [],
  description: 'Improved siege and science',
  treePosition: { row: 0, col: 4 },
  masteryEffect: { type: 'MODIFY_YIELD', target: 'empire', yield: 'science', value: 3 },
  masteryCodexCount: 2,
};

export const AGRICULTURE: TechnologyDef = {
  id: 'agriculture',
  name: 'Agriculture',
  age: 'antiquity',
  cost: 25,
  prerequisites: [],
  unlocks: [],
  description: 'Enables farms and sustainable food production (rulebook §9.4 Depth 1)',
  treePosition: { row: 0, col: -1 },
  masteryEffect: { type: 'MODIFY_YIELD', target: 'empire', yield: 'food', value: 1 },
  masteryCodexCount: 0,
};

export const ENGINEERING: TechnologyDef = {
  id: 'engineering',
  name: 'Engineering',
  age: 'antiquity',
  cost: 80,
  prerequisites: ['masonry'],
  unlocks: ['amphitheatre'],
  description: 'Enables Amphitheatre and Ancient Bridge (rulebook §9.4 Depth 5)',
  treePosition: { row: 3, col: 3 },
  masteryEffect: { type: 'MODIFY_YIELD', target: 'empire', yield: 'production', value: 2 },
  masteryCodexCount: 1,
};

export const MILITARY_TRAINING: TechnologyDef = {
  id: 'military_training',
  name: 'Military Training',
  age: 'antiquity',
  cost: 80,
  prerequisites: ['bronze_working'],
  unlocks: ['arena'],
  description: 'Enables Arena, unlocking Flanking promotions (rulebook §9.4 Depth 5)',
  treePosition: { row: 2, col: 3 },
  masteryEffect: { type: 'MODIFY_COMBAT', target: 'all', value: 3 },
  masteryCodexCount: 1,
};

export const NAVIGATION: TechnologyDef = {
  id: 'navigation',
  name: 'Navigation',
  age: 'antiquity',
  cost: 80,
  prerequisites: ['sailing'],
  unlocks: [],
  description: 'Advanced seafaring: Lighthouse and Quadrireme (rulebook §9.4 Depth 5)',
  treePosition: { row: 4, col: 3 },
  masteryEffect: { type: 'MODIFY_COMBAT', target: 'naval', value: 3 },
  masteryCodexCount: 1,
};

export const ALL_ANTIQUITY_TECHS: ReadonlyArray<TechnologyDef> = [
  POTTERY, ANIMAL_HUSBANDRY, MINING, SAILING,
  ARCHERY, WRITING, MASONRY, BRONZE_WORKING, WHEEL,
  IRRIGATION, CURRENCY, CONSTRUCTION, IRON_WORKING, MATHEMATICS,
  AGRICULTURE, ENGINEERING, MILITARY_TRAINING, NAVIGATION,
];
