import type { CivilizationDef } from './types';

export const ROME: CivilizationDef = {
  id: 'rome',
  name: 'Rome',
  age: 'antiquity',
  uniqueAbility: {
    name: 'All Roads Lead to Rome',
    description: 'Trade routes to your capital provide bonus gold. +1 production in all cities.',
    effects: [{ type: 'MODIFY_YIELD', target: 'empire', yield: 'production', value: 1 }],
  },
  uniqueUnit: null, // TODO(content): add unique unit legion when content batch lands
  uniqueBuilding: 'bath',
  legacyBonus: {
    name: 'Roman Engineering',
    description: '+2 production in all cities in future ages',
    effect: { type: 'MODIFY_YIELD', target: 'empire', yield: 'production', value: 2 },
  },
  color: '#e53935',
};

export const EGYPT: CivilizationDef = {
  id: 'egypt',
  name: 'Egypt',
  age: 'antiquity',
  uniqueAbility: {
    name: 'Gift of the Nile',
    description: '+15% production toward wonders. Floodplains provide extra culture.',
    effects: [{ type: 'DISCOUNT_PRODUCTION', target: 'wonder', percent: 15 }],
  },
  uniqueUnit: null, // TODO(content): add unique unit chariot_archer when content batch lands
  uniqueBuilding: null, // TODO(content): add unique building sphinx when content batch lands
  legacyBonus: {
    name: 'Monument Builders',
    description: '+2 culture in all cities in future ages',
    effect: { type: 'MODIFY_YIELD', target: 'empire', yield: 'culture', value: 2 },
  },
  color: '#fdd835',
};

export const GREECE: CivilizationDef = {
  id: 'greece',
  name: 'Greece',
  age: 'antiquity',
  uniqueAbility: {
    name: 'Plato\'s Republic',
    description: 'One extra wildcard policy slot. +1 science in every city.',
    effects: [{ type: 'MODIFY_YIELD', target: 'empire', yield: 'science', value: 1 }],
  },
  uniqueUnit: null, // TODO(content): add unique unit hoplite when content batch lands
  uniqueBuilding: null, // TODO(content): add unique building acropolis when content batch lands
  legacyBonus: {
    name: 'Athenian Thought',
    description: '+2 science in all cities in future ages',
    effect: { type: 'MODIFY_YIELD', target: 'empire', yield: 'science', value: 2 },
  },
  color: '#1e88e5',
};

export const PERSIA: CivilizationDef = {
  id: 'persia',
  name: 'Persia',
  age: 'antiquity',
  uniqueAbility: {
    name: 'Satrapies',
    description: '+2 gold and +1 culture in all cities during a Golden Age.',
    effects: [{ type: 'MODIFY_YIELD', target: 'empire', yield: 'gold', value: 2 }],
  },
  uniqueUnit: null, // TODO(content): add unique unit immortal when content batch lands
  uniqueBuilding: null, // TODO(content): add unique building pairidaeza when content batch lands
  legacyBonus: {
    name: 'Royal Road',
    description: '+3 gold in all cities in future ages',
    effect: { type: 'MODIFY_YIELD', target: 'empire', yield: 'gold', value: 3 },
  },
  color: '#8e24aa',
};

export const INDIA: CivilizationDef = {
  id: 'india',
  name: 'India',
  age: 'antiquity',
  uniqueAbility: {
    name: 'Dharma',
    description: 'Cities gain follower bonuses from all religions. +2 faith.',
    effects: [{ type: 'MODIFY_YIELD', target: 'empire', yield: 'faith', value: 2 }],
  },
  uniqueUnit: null, // TODO(content): add unique unit varu when content batch lands
  uniqueBuilding: null, // TODO(content): add unique building stepwell when content batch lands
  legacyBonus: {
    name: 'Spiritual Tradition',
    description: '+3 faith in all cities in future ages',
    effect: { type: 'MODIFY_YIELD', target: 'empire', yield: 'faith', value: 3 },
  },
  color: '#ff6f00',
};

export const CHINA: CivilizationDef = {
  id: 'china',
  name: 'China',
  age: 'antiquity',
  uniqueAbility: {
    name: 'Dynastic Cycle',
    description: 'Eurekas and inspirations provide 60% instead of 50%.',
    effects: [{ type: 'MODIFY_YIELD', target: 'empire', yield: 'science', value: 1 }],
  },
  uniqueUnit: null, // TODO(content): add unique unit crouching_tiger when content batch lands
  uniqueBuilding: 'great_wall',
  legacyBonus: {
    name: 'Mandate of Heaven',
    description: '+1 science and +1 culture in future ages',
    effect: { type: 'MODIFY_YIELD', target: 'empire', yield: 'science', value: 1 },
  },
  color: '#43a047',
};

export const VIKINGS: CivilizationDef = {
  id: 'vikings',
  name: 'Vikings',
  age: 'antiquity',
  description: 'Seafaring raiders and explorers from the north. Masters of coastal warfare and exploration.',
  uniqueAbility: {
    name: 'Norsemen',
    description: 'Ships gain +2 combat strength and -1 production cost. Ocean tiles provide +1 food.',
    effects: [
      { type: 'MODIFY_COMBAT', target: 'naval', value: 2 },
      { type: 'MODIFY_YIELD', target: 'tile', yield: 'food', value: 1 },
    ],
  },
  uniqueUnit: null,
  uniqueBuilding: null,
  legacyBonus: {
    name: 'Masters of the Longship',
    description: '+1 movement for naval units in future ages',
    effect: { type: 'MODIFY_MOVEMENT', target: 'naval', value: 1 },
  },
  color: '#00bcd4',
  startingBias: 'coastal',
};

export const ASSYRIA: CivilizationDef = {
  id: 'assyria',
  name: 'Assyria',
  age: 'antiquity',
  description: 'Iron-fisted empire builders whose siege mastery reshaped the ancient Near East.',
  uniqueAbility: {
    name: 'Siege Warfare',
    description: '+5 combat strength for siege units. Conquered cities retain one extra population.',
    effects: [
      { type: 'MODIFY_COMBAT', target: 'siege', value: 5 },
      { type: 'MODIFY_YIELD', target: 'empire', yield: 'production', value: 1 },
    ],
  },
  uniqueUnit: null,
  uniqueBuilding: null,
  legacyBonus: {
    name: 'Assyrian Discipline',
    description: '+2 production in all cities in future ages',
    effect: { type: 'MODIFY_YIELD', target: 'empire', yield: 'production', value: 2 },
  },
  color: '#d32f2f',
  historicalPair: [],
};

export const HITTITES: CivilizationDef = {
  id: 'hittites',
  name: 'Hittites',
  age: 'antiquity',
  description: 'Masters of chariot warfare and early iron-working who rivalled Egypt at Kadesh.',
  uniqueAbility: {
    name: 'Iron Chariots',
    description: '+3 combat strength for cavalry units. +1 production from strategic resources.',
    effects: [
      { type: 'MODIFY_COMBAT', target: 'cavalry', value: 3 },
      { type: 'MODIFY_YIELD', target: 'tile', yield: 'production', value: 1 },
    ],
  },
  uniqueUnit: null,
  uniqueBuilding: null,
  legacyBonus: {
    name: 'Hittite Metalcraft',
    description: '+1 production and +1 science in all cities in future ages',
    effect: { type: 'MODIFY_YIELD', target: 'empire', yield: 'production', value: 1 },
  },
  color: '#6d4c41',
  historicalPair: [],
};

export const PHOENICIA: CivilizationDef = {
  id: 'phoenicia',
  name: 'Phoenicia',
  age: 'antiquity',
  description: 'Seafaring merchant traders who founded Carthage and spread the alphabet across the Mediterranean.',
  uniqueAbility: {
    name: 'Mediterranean Colonists',
    description: 'Coastal cities gain +2 gold. +1 movement for naval units.',
    effects: [
      { type: 'MODIFY_YIELD', target: 'empire', yield: 'gold', value: 2 },
      { type: 'MODIFY_MOVEMENT', target: 'naval', value: 1 },
    ],
  },
  uniqueUnit: null,
  uniqueBuilding: null,
  legacyBonus: {
    name: 'Phoenician Trade Network',
    description: '+3 gold in all cities in future ages',
    effect: { type: 'MODIFY_YIELD', target: 'empire', yield: 'gold', value: 3 },
  },
  color: '#5c6bc0',
  startingBias: 'coastal',
  historicalPair: [],
};

export const KOREA: CivilizationDef = {
  id: 'korea',
  name: 'Korea',
  age: 'antiquity',
  description: 'Scholarly kingdom whose seowon academies produced pioneering advances in science and metal movable type.',
  uniqueAbility: {
    name: 'Three Kingdoms',
    description: '+2 science per campus district. Farms adjacent to a campus provide +1 science.',
    effects: [{ type: 'MODIFY_YIELD', target: 'empire', yield: 'science', value: 2 }],
  },
  uniqueUnit: null,
  uniqueBuilding: null,
  legacyBonus: {
    name: 'Korean Scholarship',
    description: '+3 science in all cities in future ages',
    effect: { type: 'MODIFY_YIELD', target: 'empire', yield: 'science', value: 3 },
  },
  color: '#0277bd',
};

export const ALL_ANTIQUITY_CIVS: ReadonlyArray<CivilizationDef> = [
  ROME, EGYPT, GREECE, PERSIA, INDIA, CHINA, VIKINGS,
  ASSYRIA, HITTITES, PHOENICIA, KOREA,
];
