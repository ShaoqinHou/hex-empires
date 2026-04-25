import type { CivilizationDef } from './types';

export const AMERICA: CivilizationDef = {
  id: 'america',
  name: 'America',
  age: 'modern',
  uniqueAbility: {
    name: 'Founding Fathers',
    description: '+1 to all yields per alliance.',
    effects: [
      { type: 'MODIFY_YIELD', target: 'empire', yield: 'food', value: 1 },
      { type: 'MODIFY_YIELD', target: 'empire', yield: 'production', value: 1 },
      { type: 'MODIFY_YIELD', target: 'empire', yield: 'gold', value: 1 },
      { type: 'MODIFY_YIELD', target: 'empire', yield: 'science', value: 1 },
      { type: 'MODIFY_YIELD', target: 'empire', yield: 'culture', value: 1 },
      { type: 'MODIFY_YIELD', target: 'empire', yield: 'faith', value: 1 },
    ],
  },
  uniqueUnit: null, // TODO(content): add unique unit minuteman when content batch lands
  uniqueBuilding: null, // TODO(content): add unique building film_studio when content batch lands
  legacyBonus: {
    name: 'American Dream',
    description: '+2 culture in all cities in future ages',
    effect: { type: 'MODIFY_YIELD', target: 'empire', yield: 'culture', value: 2 },
  },
  color: '#0d47a1',
};

export const GERMANY: CivilizationDef = {
  id: 'germany',
  name: 'Germany',
  age: 'modern',
  uniqueAbility: {
    name: 'Free Imperial Cities',
    description: '+1 production per specialty district.',
    effects: [{ type: 'MODIFY_YIELD', target: 'city', yield: 'production', value: 1 }],
  },
  uniqueUnit: null, // TODO(content): add unique unit u_boat when content batch lands
  uniqueBuilding: null, // TODO(content): add unique building hansa when content batch lands
  legacyBonus: {
    name: 'German Engineering',
    description: '+3 production in all cities in future ages',
    effect: { type: 'MODIFY_YIELD', target: 'empire', yield: 'production', value: 3 },
  },
  color: '#424242',
};

export const RUSSIA: CivilizationDef = {
  id: 'russia',
  name: 'Russia',
  age: 'modern',
  uniqueAbility: {
    name: 'Mother Russia',
    description: '+1 faith and +1 production from tundra tiles.',
    effects: [
      { type: 'MODIFY_YIELD', target: 'tile', yield: 'faith', value: 1 },
      { type: 'MODIFY_YIELD', target: 'tile', yield: 'production', value: 1 },
    ],
  },
  uniqueUnit: 'cossack',
  uniqueBuilding: null,
  legacyBonus: {
    name: 'Russian Orthodoxy',
    description: '+3 faith in all cities in future ages',
    effect: { type: 'MODIFY_YIELD', target: 'empire', yield: 'faith', value: 3 },
  },
  color: '#880e4f',
};

export const BRAZIL: CivilizationDef = {
  id: 'brazil',
  name: 'Brazil',
  age: 'modern',
  uniqueAbility: {
    name: 'Amazon',
    description: '+1 adjacency bonus per rainforest tile.',
    effects: [{ type: 'MODIFY_YIELD', target: 'tile', yield: 'production', value: 1 }],
  },
  uniqueUnit: null, // TODO(content): add unique unit minas_geraes when content batch lands
  uniqueBuilding: null, // TODO(content): add unique building street_carnival when content batch lands
  legacyBonus: {
    name: 'Carnival Spirit',
    description: '+2 culture in all cities in future ages',
    effect: { type: 'MODIFY_YIELD', target: 'empire', yield: 'culture', value: 2 },
  },
  color: '#1b5e20',
};

export const MEXICO: CivilizationDef = {
  id: 'mexico',
  name: 'Mexico',
  age: 'modern',
  description: ' heirs of Aztec and Spanish traditions whose revolution reshaped the Americas.',
  uniqueAbility: {
    name: 'Reforma',
    description: '+2 culture and +1 gold per city. City-state suzerainty bonuses are doubled.',
    effects: [
      { type: 'MODIFY_YIELD', target: 'empire', yield: 'culture', value: 2 },
      { type: 'MODIFY_YIELD', target: 'empire', yield: 'gold', value: 1 },
    ],
  },
  uniqueUnit: null,
  uniqueBuilding: null,
  legacyBonus: {
    name: 'Mexican Heritage',
    description: '+3 culture in all cities in future ages',
    effect: { type: 'MODIFY_YIELD', target: 'empire', yield: 'culture', value: 3 },
  },
  color: '#00695c',
  historicalPair: ['maya', 'spain'],
};

export const SWEDEN: CivilizationDef = {
  id: 'sweden',
  name: 'Sweden',
  age: 'modern',
  description: 'Nordic innovators whose Nobel Prize legacy and engineering prowess shaped the modern world.',
  uniqueAbility: {
    name: 'Nobel Prize',
    description: '+2 science and +1 culture per city. Great People cost 10% less.',
    effects: [
      { type: 'MODIFY_YIELD', target: 'empire', yield: 'science', value: 2 },
      { type: 'MODIFY_YIELD', target: 'empire', yield: 'culture', value: 1 },
    ],
  },
  uniqueUnit: null,
  uniqueBuilding: null,
  legacyBonus: {
    name: 'Swedish Innovation',
    description: '+3 science in all cities in future ages',
    effect: { type: 'MODIFY_YIELD', target: 'empire', yield: 'science', value: 3 },
  },
  color: '#1565c0',
  historicalPair: [],
};

export const AUSTRALIA: CivilizationDef = {
  id: 'australia',
  name: 'Australia',
  age: 'modern',
  description: 'Continent-nation whose vast landscapes and vibrant cities embody resilience and opportunity.',
  uniqueAbility: {
    name: 'Land Down Under',
    description: '+3 production in coastal cities. +1 culture per district.',
    effects: [
      { type: 'MODIFY_YIELD', target: 'city', yield: 'production', value: 3 },
      { type: 'MODIFY_YIELD', target: 'empire', yield: 'culture', value: 1 },
    ],
  },
  uniqueUnit: null,
  uniqueBuilding: null,
  legacyBonus: {
    name: 'Australian Grit',
    description: '+2 production and +1 culture in all cities in future ages',
    effect: { type: 'MODIFY_YIELD', target: 'empire', yield: 'production', value: 2 },
  },
  color: '#ffd600',
  startingBias: 'coastal',
  historicalPair: ['england'],
};

export const ALL_MODERN_CIVS: ReadonlyArray<CivilizationDef> = [
  AMERICA, GERMANY, RUSSIA, BRAZIL,
  MEXICO, SWEDEN, AUSTRALIA,
];
