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
  uniqueBuilding: 'mission',
  legacyBonus: {
    name: 'Colonial Wealth',
    description: '+3 gold in all cities in future ages',
    effect: { type: 'MODIFY_YIELD', target: 'empire', yield: 'gold', value: 3 },
  },
  color: '#c62828',
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
  uniqueBuilding: 'royal_navy_dockyard',
  legacyBonus: {
    name: 'Workshop of the World',
    description: '+2 production for coastal cities in future ages',
    effect: { type: 'MODIFY_YIELD', target: 'city', yield: 'production', value: 2 },
  },
  color: '#1565c0',
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
  uniqueBuilding: 'chateau',
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
  uniqueUnit: 'janissary',
  uniqueBuilding: 'grand_bazaar',
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
  uniqueUnit: 'samurai',
  uniqueBuilding: 'electronics_factory',
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
  uniqueBuilding: 'ordu',
  legacyBonus: {
    name: 'Steppe Legacy',
    description: '+1 movement for cavalry units in future ages',
    effect: { type: 'MODIFY_MOVEMENT', target: 'cavalry', value: 1 },
  },
  color: '#33691e',
};

export const ALL_EXPLORATION_CIVS: ReadonlyArray<CivilizationDef> = [
  SPAIN, ENGLAND, FRANCE, OTTOMAN, JAPAN, MONGOLIA,
];
