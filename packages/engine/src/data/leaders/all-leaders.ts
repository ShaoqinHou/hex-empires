import type { LeaderDef } from './types';

export const AUGUSTUS: LeaderDef = {
  id: 'augustus',
  name: 'Augustus',
  ability: {
    name: 'Pax Romana',
    description: '+5 combat strength when defending. Cities grow 10% faster.',
    effects: [{ type: 'MODIFY_COMBAT', target: 'all', value: 5 }],
  },
  agendas: ['expansionist', 'builder'],
  compatibleAges: ['antiquity', 'exploration', 'modern'],
};

export const CLEOPATRA: LeaderDef = {
  id: 'cleopatra',
  name: 'Cleopatra',
  ability: {
    name: 'Mediterranean Bride',
    description: 'Trade routes to other civs provide +4 gold. +2 food from floodplains.',
    effects: [{ type: 'MODIFY_YIELD', target: 'empire', yield: 'gold', value: 2 }],
  },
  agendas: ['diplomat', 'trader'],
  compatibleAges: ['antiquity', 'exploration', 'modern'],
};

export const PERICLES: LeaderDef = {
  id: 'pericles',
  name: 'Pericles',
  ability: {
    name: 'Surrounded by Glory',
    description: '+5% culture per city-state you are suzerain of.',
    effects: [{ type: 'MODIFY_YIELD', target: 'empire', yield: 'culture', value: 2 }],
  },
  agendas: ['culturalist', 'diplomat'],
  compatibleAges: ['antiquity', 'exploration', 'modern'],
};

export const CYRUS: LeaderDef = {
  id: 'cyrus',
  name: 'Cyrus',
  ability: {
    name: 'Fall of Babylon',
    description: '+2 movement for all units for 10 turns after declaring surprise war.',
    effects: [{ type: 'MODIFY_MOVEMENT', target: 'all', value: 2 }],
  },
  agendas: ['conqueror', 'opportunist'],
  compatibleAges: ['antiquity', 'exploration', 'modern'],
};

export const GANDHI: LeaderDef = {
  id: 'gandhi',
  name: 'Gandhi',
  ability: {
    name: 'Satyagraha',
    description: '+5 faith for each civ at peace with. Opponents receive doubled war weariness.',
    effects: [{ type: 'MODIFY_YIELD', target: 'empire', yield: 'faith', value: 3 }],
  },
  agendas: ['peacemaker', 'religious'],
  compatibleAges: ['antiquity', 'exploration', 'modern'],
};

export const QIN_SHI_HUANG: LeaderDef = {
  id: 'qin_shi_huang',
  name: 'Qin Shi Huang',
  ability: {
    name: 'First Emperor',
    description: 'Builders receive extra charge. Can spend builder charges to rush wonders.',
    effects: [{ type: 'MODIFY_YIELD', target: 'empire', yield: 'production', value: 1 }],
  },
  agendas: ['builder', 'wonder_obsessed'],
  compatibleAges: ['antiquity', 'exploration', 'modern'],
};

export const ALEXANDER: LeaderDef = {
  id: 'alexander',
  name: 'Alexander',
  ability: {
    name: 'To the World\'s End',
    description: 'Cities never incur war weariness. All military units heal when capturing a city.',
    effects: [{ type: 'MODIFY_COMBAT', target: 'all', value: 3 }],
  },
  agendas: ['conqueror', 'expansionist'],
  compatibleAges: ['antiquity', 'exploration', 'modern'],
};

export const HATSHEPSUT: LeaderDef = {
  id: 'hatshepsut',
  name: 'Hatshepsut',
  ability: {
    name: 'Eye of Horus',
    description: 'International trade routes generate +2 gold and +1 food.',
    effects: [{ type: 'MODIFY_YIELD', target: 'empire', yield: 'gold', value: 3 }],
  },
  agendas: ['trader', 'builder'],
  compatibleAges: ['antiquity', 'exploration', 'modern'],
};

export const GENGHIS_KHAN: LeaderDef = {
  id: 'genghis_khan',
  name: 'Genghis Khan',
  ability: {
    name: 'Mongol Horde',
    description: '+10 combat strength for cavalry units. Cavalry units ignore movement penalties from terrain.',
    effects: [{ type: 'MODIFY_COMBAT', target: 'cavalry', value: 10 }],
  },
  agendas: ['conqueror', 'expansionist'],
  compatibleAges: ['antiquity', 'exploration', 'modern'],
};

export const ALL_LEADERS: ReadonlyArray<LeaderDef> = [
  AUGUSTUS, CLEOPATRA, PERICLES, CYRUS, GANDHI,
  QIN_SHI_HUANG, ALEXANDER, HATSHEPSUT, GENGHIS_KHAN,
];
