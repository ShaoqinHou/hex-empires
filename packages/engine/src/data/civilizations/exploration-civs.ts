import type { CivilizationDef } from './types';

export const SPAIN: CivilizationDef = {
  id: 'spain',
  name: 'Spain',
  age: 'exploration',
  uniqueAbility: {
    name: 'Treasure Fleet',
    description: 'Trade routes provide +3 gold.',
    effects: [{ type: 'MODIFY_YIELD', target: 'empire', yield: 'gold', value: 3 }],
  },
  uniqueUnit: 'conquistador',
  uniqueBuilding: null,
  legacyBonus: {
    name: 'Colonial Wealth',
    description: '+3 gold in all cities in future ages',
    effect: { type: 'MODIFY_YIELD', target: 'empire', yield: 'gold', value: 3 },
  },
  color: '#c62828',
  historicalPair: ['rome'],
};

export const ENGLAND: CivilizationDef = {
  id: 'england',
  name: 'England',
  age: 'exploration',
  uniqueAbility: {
    name: 'Sea Dogs',
    description: '+1 movement for all naval units.',
    effects: [{ type: 'MODIFY_MOVEMENT', target: 'naval', value: 1 }],
  },
  uniqueUnit: 'redcoat',
  uniqueBuilding: null,
  legacyBonus: {
    name: 'Workshop of the World',
    description: '+2 production for coastal cities in future ages',
    effect: { type: 'MODIFY_YIELD', target: 'city', yield: 'production', value: 2 },
  },
  color: '#1565c0',
  historicalPair: ['vikings'],
};

export const FRANCE: CivilizationDef = {
  id: 'france',
  name: 'France',
  age: 'exploration',
  uniqueAbility: {
    name: 'Grand Tour',
    description: '+2 culture per wonder in your empire.',
    effects: [{ type: 'MODIFY_YIELD', target: 'empire', yield: 'culture', value: 2 }],
  },
  uniqueUnit: 'garde_imperiale',
  uniqueBuilding: null,
  legacyBonus: {
    name: 'French Enlightenment',
    description: '+3 culture in all cities in future ages',
    effect: { type: 'MODIFY_YIELD', target: 'empire', yield: 'culture', value: 3 },
  },
  color: '#4527a0',
};

export const OTTOMAN: CivilizationDef = {
  id: 'ottoman',
  name: 'Ottoman Empire',
  age: 'exploration',
  uniqueAbility: {
    name: 'Great Bombard',
    description: '+5 combat strength for siege units.',
    effects: [{ type: 'MODIFY_COMBAT', target: 'siege', value: 5 }],
  },
  uniqueUnit: null, // TODO(content): add unique unit janissary when content batch lands
  uniqueBuilding: null, // TODO(content): add unique building grand_bazaar when content batch lands
  legacyBonus: {
    name: 'Ottoman Trade',
    description: '+2 gold in all cities in future ages',
    effect: { type: 'MODIFY_YIELD', target: 'empire', yield: 'gold', value: 2 },
  },
  color: '#e65100',
};

export const JAPAN: CivilizationDef = {
  id: 'japan',
  name: 'Japan',
  age: 'exploration',
  uniqueAbility: {
    name: 'Bushido',
    description: '+5 combat strength for units at full health.',
    effects: [{ type: 'MODIFY_COMBAT', target: 'all', value: 5 }],
  },
  uniqueUnit: null, // TODO(content): add unique unit samurai when content batch lands
  uniqueBuilding: null, // TODO(content): add unique building electronics_factory when content batch lands
  legacyBonus: {
    name: 'Way of the Warrior',
    description: '+2 production in all cities in future ages',
    effect: { type: 'MODIFY_YIELD', target: 'empire', yield: 'production', value: 2 },
  },
  color: '#b71c1c',
};

export const MONGOLIA: CivilizationDef = {
  id: 'mongolia',
  name: 'Mongolia',
  age: 'exploration',
  uniqueAbility: {
    name: 'Mongol Horde',
    description: '+3 movement for cavalry units.',
    effects: [{ type: 'MODIFY_MOVEMENT', target: 'cavalry', value: 3 }],
  },
  uniqueUnit: 'keshig',
  uniqueBuilding: null,
  legacyBonus: {
    name: 'Steppe Legacy',
    description: '+1 movement for cavalry units in future ages',
    effect: { type: 'MODIFY_MOVEMENT', target: 'cavalry', value: 1 },
  },
  color: '#33691e',
};

export const MAYA: CivilizationDef = {
  id: 'maya',
  name: 'Maya',
  age: 'exploration',
  description: 'Astronomers and architects of the jungle whose city-states mastered mathematics and the calendar.',
  uniqueAbility: {
    name: 'Mayan Astronomy',
    description: '+2 science in all cities. Farms adjacent to the capital provide +1 science.',
    effects: [
      { type: 'MODIFY_YIELD', target: 'empire', yield: 'science', value: 2 },
    ],
  },
  uniqueUnit: null,
  uniqueBuilding: null,
  legacyBonus: {
    name: 'Mayan Calendars',
    description: '+3 science in all cities in future ages',
    effect: { type: 'MODIFY_YIELD', target: 'empire', yield: 'science', value: 3 },
  },
  color: '#2e7d32',
  historicalPair: [],
};

export const NORMANS: CivilizationDef = {
  id: 'normans',
  name: 'Normans',
  age: 'exploration',
  description: 'Warrior-descendants of Vikings who conquered England and Sicily, building castles and cathedrals across Europe.',
  uniqueAbility: {
    name: 'Castle Builders',
    description: '+2 culture in all cities. Fortified cities gain +4 defense bonus.',
    effects: [
      { type: 'MODIFY_YIELD', target: 'empire', yield: 'culture', value: 2 },
      { type: 'MODIFY_COMBAT', target: 'all', value: 2 },
    ],
  },
  uniqueUnit: null,
  uniqueBuilding: null,
  legacyBonus: {
    name: 'Norman Legacy',
    description: '+2 culture and +1 production in all cities in future ages',
    effect: { type: 'MODIFY_YIELD', target: 'empire', yield: 'culture', value: 2 },
  },
  color: '#455a64',
  historicalPair: ['vikings'],
};

export const PORTUGAL: CivilizationDef = {
  id: 'portugal',
  name: 'Portugal',
  age: 'exploration',
  description: 'Seafaring empire whose caravels charted new trade routes spanning four continents.',
  uniqueAbility: {
    name: 'Casa da Índia',
    description: '+3 gold from international trade routes. Naval units gain +1 movement.',
    effects: [
      { type: 'MODIFY_YIELD', target: 'empire', yield: 'gold', value: 3 },
      { type: 'MODIFY_MOVEMENT', target: 'naval', value: 1 },
    ],
  },
  uniqueUnit: null,
  uniqueBuilding: null,
  legacyBonus: {
    name: 'Portuguese Navigation',
    description: '+3 gold and +1 movement for naval units in future ages',
    effect: { type: 'MODIFY_YIELD', target: 'empire', yield: 'gold', value: 3 },
  },
  color: '#2e7d32',
  startingBias: 'coastal',
  historicalPair: [],
};

export const ALL_EXPLORATION_CIVS: ReadonlyArray<CivilizationDef> = [
  SPAIN, ENGLAND, FRANCE, OTTOMAN, JAPAN, MONGOLIA,
  MAYA, NORMANS, PORTUGAL,
];
