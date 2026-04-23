/**
 * Memento data barrel.
 * 10 minimal Mementos matching recognizable historical artifacts.
 */

import type { MementoDef } from '../../types/Memento';

export const COMPLAINT_TO_EA_NASIR: MementoDef = {
  id: 'complaint-to-ea-nasir',
  name: 'Complaint to Ea-Nasir',
  description: '+20 Gold at game start — even the oldest merchants knew gold talks.',
  age: 'antiquity',
  effect: { type: 'MODIFY_YIELD', target: 'empire', yield: 'gold', value: 20 },
  unlockCondition: { type: 'foundation_level', level: 2 },
};

export const ROSETTA_STONE: MementoDef = {
  id: 'rosetta-stone',
  name: 'Rosetta Stone',
  description: '+2 Science per turn from game start.',
  age: 'antiquity',
  effect: { type: 'MODIFY_YIELD', target: 'empire', yield: 'science', value: 2 },
  unlockCondition: { type: 'challenge', challengeId: 'FIRST_TECH_RESEARCHED' },
};

export const GUTENBERG_BIBLE: MementoDef = {
  id: 'gutenberg-bible',
  name: 'Gutenberg Bible',
  description: '+2 Culture per turn from game start.',
  age: 'exploration',
  effect: { type: 'MODIFY_YIELD', target: 'empire', yield: 'culture', value: 2 },
  unlockCondition: { type: 'foundation_level', level: 3 },
};

export const MARCO_POLO_JOURNAL: MementoDef = {
  id: 'marco-polo-journal',
  name: 'Marco Polo Journal',
  description: '+20 Gold at game start — funded by distant trade.',
  age: 'exploration',
  effect: { type: 'MODIFY_YIELD', target: 'empire', yield: 'gold', value: 20 },
  unlockCondition: { type: 'challenge', challengeId: 'FIRST_DOMINATION_VICTORY' },
};

export const MAGNA_CARTA: MementoDef = {
  id: 'magna-carta',
  name: 'Magna Carta',
  description: '+2 Culture per turn — the foundation of civic freedoms.',
  age: 'exploration',
  effect: { type: 'MODIFY_YIELD', target: 'empire', yield: 'culture', value: 2 },
  unlockCondition: { type: 'foundation_level', level: 4 },
};

export const DECLARATION_OF_INDEPENDENCE: MementoDef = {
  id: 'declaration-of-independence',
  name: 'Declaration of Independence',
  description: '+3 Culture per turn — liberty rings across your empire.',
  age: 'modern',
  effect: { type: 'MODIFY_YIELD', target: 'empire', yield: 'culture', value: 3 },
  unlockCondition: { type: 'challenge', challengeId: 'FIRST_SCIENCE_VICTORY' },
};

export const ENIGMA_MACHINE: MementoDef = {
  id: 'enigma-machine',
  name: 'Enigma Machine',
  description: '+3 Science per turn — codebreaking accelerates research.',
  age: 'modern',
  effect: { type: 'MODIFY_YIELD', target: 'empire', yield: 'science', value: 3 },
  unlockCondition: { type: 'foundation_level', level: 5 },
};

export const NAPOLEON_HAT: MementoDef = {
  id: 'napoleon-hat',
  name: 'Napoleon Hat',
  description: '+5 Combat Strength for all units — conquer in style.',
  age: 'exploration',
  effect: { type: 'MODIFY_COMBAT', target: 'all', value: 5 },
  unlockCondition: { type: 'challenge', challengeId: 'COMPLETE_ANTIQUITY' },
};

export const NEWTON_APPLE: MementoDef = {
  id: 'newton-apple',
  name: 'Newton Apple',
  description: '+3 Science per turn — gravity never stops pulling.',
  age: 'exploration',
  effect: { type: 'MODIFY_YIELD', target: 'empire', yield: 'science', value: 3 },
  unlockCondition: { type: 'foundation_level', level: 6 },
};

export const HOLY_GRAIL: MementoDef = {
  id: 'holy-grail',
  name: 'Holy Grail',
  description: '+3 Faith per turn — the quest begins anew.',
  age: 'antiquity',
  effect: { type: 'MODIFY_YIELD', target: 'empire', yield: 'faith', value: 3 },
  unlockCondition: { type: 'challenge', challengeId: 'COMPLETE_EXPLORATION' },
};

export const DEAD_SEA_SCROLLS: MementoDef = {
  id: 'dead-sea-scrolls',
  name: 'Dead Sea Scrolls',
  description: '+2 Faith per turn — ancient scriptures inspire devotion.',
  age: 'antiquity',
  effect: { type: 'MODIFY_YIELD', target: 'empire', yield: 'faith', value: 2 },
  unlockCondition: { type: 'foundation_level', level: 3 },
};

export const TERRACOTTA_WARRIOR: MementoDef = {
  id: 'terracotta-warrior',
  name: 'Terracotta Warrior',
  description: '+3 Combat Strength for all melee units — an eternal guardian.',
  age: 'antiquity',
  effect: { type: 'MODIFY_COMBAT', target: 'melee', value: 3 },
  unlockCondition: { type: 'challenge', challengeId: 'FIRST_COMBAT_VICTORY' },
};

export const COMPASS: MementoDef = {
  id: 'compass',
  name: 'Compass',
  description: '+1 Movement for naval units — never lose your bearing.',
  age: 'exploration',
  effect: { type: 'MODIFY_MOVEMENT', target: 'naval', value: 1 },
  unlockCondition: { type: 'foundation_level', level: 4 },
};

export const VIKING_LONGSHIP: MementoDef = {
  id: 'viking-longship',
  name: 'Viking Longship',
  description: '+2 Combat Strength for naval units — the dragon prow strikes fear.',
  age: 'exploration',
  effect: { type: 'MODIFY_COMBAT', target: 'naval', value: 2 },
  unlockCondition: { type: 'challenge', challengeId: 'COMPLETE_ANTIQUITY' },
};

export const SPACE_SHUTTLE: MementoDef = {
  id: 'space-shuttle',
  name: 'Space Shuttle',
  description: '+4 Science per turn — reach for the stars.',
  age: 'modern',
  effect: { type: 'MODIFY_YIELD', target: 'empire', yield: 'science', value: 4 },
  unlockCondition: { type: 'challenge', challengeId: 'FIRST_SCIENCE_VICTORY' },
};

export const PEACE_MEDAL: MementoDef = {
  id: 'peace-medal',
  name: 'Peace Medal',
  description: '+2 Food per turn — diplomacy feeds your people.',
  age: 'modern',
  effect: { type: 'MODIFY_YIELD', target: 'empire', yield: 'food', value: 2 },
  unlockCondition: { type: 'foundation_level', level: 6 },
};

export const ALL_MEMENTOS: ReadonlyArray<MementoDef> = [
  COMPLAINT_TO_EA_NASIR,
  ROSETTA_STONE,
  GUTENBERG_BIBLE,
  MARCO_POLO_JOURNAL,
  MAGNA_CARTA,
  DECLARATION_OF_INDEPENDENCE,
  ENIGMA_MACHINE,
  NAPOLEON_HAT,
  NEWTON_APPLE,
  HOLY_GRAIL,
  DEAD_SEA_SCROLLS,
  TERRACOTTA_WARRIOR,
  COMPASS,
  VIKING_LONGSHIP,
  SPACE_SHUTTLE,
  PEACE_MEDAL,
];
