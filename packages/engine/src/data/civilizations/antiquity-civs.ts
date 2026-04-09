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
  uniqueUnit: 'legion',
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
  uniqueUnit: 'chariot_archer',
  uniqueBuilding: 'sphinx',
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
  uniqueUnit: 'hoplite',
  uniqueBuilding: 'acropolis',
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
  uniqueUnit: 'immortal',
  uniqueBuilding: 'pairidaeza',
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
  uniqueUnit: 'varu',
  uniqueBuilding: 'stepwell',
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
  uniqueUnit: 'crouching_tiger',
  uniqueBuilding: 'great_wall',
  legacyBonus: {
    name: 'Mandate of Heaven',
    description: '+1 science and +1 culture in future ages',
    effect: { type: 'MODIFY_YIELD', target: 'empire', yield: 'science', value: 1 },
  },
  color: '#43a047',
};

export const ALL_ANTIQUITY_CIVS: ReadonlyArray<CivilizationDef> = [
  ROME, EGYPT, GREECE, PERSIA, INDIA, CHINA,
];
