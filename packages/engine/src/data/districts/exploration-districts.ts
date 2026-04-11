/**
 * Exploration Age Districts
 *
 * Advanced districts available in the exploration age.
 */

import type { DistrictDef } from '../../types/District';
import type { YieldSet } from '../../types/Yields';

const Y = (food: number, production: number, gold: number, science: number, culture: number, faith: number, influence: number, housing: number, diplomacy: number): YieldSet => ({
  food, production, gold, science, culture, faith, influence, housing, diplomacy
});

const EMPTY_YIELDS: YieldSet = Y(0, 0, 0, 0, 0, 0, 0, 0, 0);

/**
 * DOWNTOWN - Modern commercial center
 * Higher level commercial hub with additional gold and housing
 */
export const DOWNTOWN_DISTRICT: DistrictDef = {
  id: 'downtown',
  name: 'Downtown',
  type: 'downtown',
  age: 'exploration',
  cost: 200,
  requiredTech: 'banking',
  populationCost: 2,
  yields: Y(0, 2, 4, 0, 1, 0, 1, 2, 0),
  adjacencyYields: Y(0, 0, 1, 0, 0, 0, 0, 0, 0),
  maxLevel: 3,
  allowedBuildings: ['bank', 'stock_exchange', 'stock_market'],
  placementConstraint: {
    minDistanceFromCity: 1,
    maxDistanceFromCity: 5,
  },
  effects: [
    '+1 Gold per adjacent District (doubled if Commercial Hub)',
    '+2 Housing per level',
    '+1 Influence per level',
    'Trade routes gain +50% gold bonus'
  ],
};

/**
 * AERODROME - Air force district
 * Allows construction of air units
 */
export const AERODROME_DISTRICT: DistrictDef = {
  id: 'aerodrome',
  name: 'Aerodrome',
  type: 'aerodrome',
  age: 'exploration',
  cost: 250,
  requiredTech: 'flight',
  populationCost: 2,
  yields: Y(0, 3, 1, 1, 0, 0, 0, 1, 0),
  adjacencyYields: EMPTY_YIELDS,
  maxLevel: 2,
  allowedBuildings: ['hangar', 'airport', 'radar_station'],
  placementConstraint: {
    minDistanceFromCity: 2,
    maxDistanceFromCity: 6,
  },
  effects: [
    'Allows construction of air units',
    'Air units refuel and repair here',
    '+1 Production per adjacent District',
    'City gains +2 Defense when adjacent'
  ],
};

/**
 * PRESERVE - Tourism and nature district
 * Generates tourism and appeal-based bonuses
 */
export const PRESERVE_DISTRICT: DistrictDef = {
  id: 'preserve',
  name: 'Preserve',
  type: 'preserve',
  age: 'exploration',
  cost: 180,
  requiredCivic: 'naturalism',
  populationCost: 1,
  yields: Y(2, 0, 1, 0, 2, 0, 0, 0, 1),
  adjacencyYields: Y(1, 0, 0, 0, 1, 0, 0, 0, 0),
  maxLevel: 2,
  allowedBuildings: ['park', 'sanctuary', 'national_park'],
  placementConstraint: {
    mustBeAdjacentToDistrictType: ['city_center', 'waterfront'],
    minDistanceFromCity: 1,
    maxDistanceFromCity: 4,
  },
  effects: [
    '+1 Tourism per adjacent Natural Wonder, Woods, or Rainforest',
    '+1 Appeal to all adjacent tiles',
    '+1 Housing per adjacent Woods or Rainforest',
    'Great Writer and Great Artist points equal to district level'
  ],
};

/**
 * EXPANDED_ENCAMPMENT - Higher tier military district
 */
export const EXPANDED_ENCAMPMENT_DISTRICT: DistrictDef = {
  id: 'expanded_encampment',
  name: 'Citadel',
  type: 'encampment',
  age: 'exploration',
  cost: 180,
  requiredTech: 'military_engineering',
  populationCost: 2,
  yields: Y(0, 3, 0, 0, 0, 0, 0, 2, 0),
  adjacencyYields: Y(0, 1, 0, 0, 0, 0, 0, 0, 0),
  maxLevel: 3,
  allowedBuildings: ['barracks', 'stable', 'armory', 'military_academy'],
  placementConstraint: {
    minDistanceFromCity: 1,
    maxDistanceFromCity: 3,
  },
  effects: [
    '+2 Production per adjacent District',
    'Military units built here start with +10 XP',
    'City center gains +3 Defense when adjacent',
    '+2 Housing per level'
  ],
};

/**
 * EXPANDED_CAMPUS - Higher tier science district
 */
export const EXPANDED_CAMPUS_DISTRICT: DistrictDef = {
  id: 'expanded_campus',
  name: 'University',
  type: 'campus',
  age: 'exploration',
  cost: 200,
  requiredTech: 'education',
  populationCost: 2,
  yields: Y(0, 1, 0, 4, 1, 0, 0, 2, 0),
  adjacencyYields: Y(0, 0, 0, 1, 0, 0, 0, 0, 0),
  maxLevel: 3,
  allowedBuildings: ['library', 'university', 'laboratory', 'research_lab'],
  placementConstraint: {
    minDistanceFromCity: 1,
    maxDistanceFromCity: 4,
  },
  effects: [
    '+2 Science per adjacent Mountain or District',
    '+25% Science output from this city',
    'Great Scientist points equal to district level × 2',
    '+2 Housing per level'
  ],
};

/**
 * EXPANDED_THEATER - Higher tier culture district
 */
export const EXPANDED_THEATER_DISTRICT: DistrictDef = {
  id: 'expanded_theater',
  name: 'Opera House',
  type: 'theater',
  age: 'exploration',
  cost: 200,
  requiredCivic: 'enlightenment',
  populationCost: 2,
  yields: Y(0, 1, 1, 0, 4, 0, 1, 2, 0),
  adjacencyYields: Y(0, 0, 0, 0, 1, 0, 0, 0, 0),
  maxLevel: 3,
  allowedBuildings: ['monument', 'amphitheater', 'museum', 'art_museum', 'archaeology_museum'],
  placementConstraint: {
    minDistanceFromCity: 1,
    maxDistanceFromCity: 4,
  },
  effects: [
    '+2 Culture per adjacent District or Wonder',
    '+1 Tourism per level',
    'Great Artist and Great Writer points equal to district level × 2',
    '+2 Housing per level'
  ],
};

/**
 * EXPANDED_HOLY_SITE - Higher tier faith district
 */
export const EXPANDED_HOLY_SITE_DISTRICT: DistrictDef = {
  id: 'expanded_holy_site',
  name: 'Cathedral',
  type: 'holy_site',
  age: 'exploration',
  cost: 200,
  requiredCivic: 'medieval_faires',
  populationCost: 2,
  yields: Y(0, 0, 1, 0, 1, 4, 0, 2, 0),
  adjacencyYields: Y(0, 0, 0, 0, 0, 1, 0, 0, 0),
  maxLevel: 3,
  allowedBuildings: ['shrine', 'temple', 'religious_building', 'cathedral', 'mosque'],
  placementConstraint: {
    minDistanceFromCity: 1,
    maxDistanceFromCity: 4,
  },
  effects: [
    '+2 Faith per adjacent Natural Wonder, Mountain, or District',
    '+1 Faith per adjacent Woods or Rainforest',
    'Great Prophet points equal to district level × 2',
    '+2 Housing per level',
    'Allows purchase of religious units with Faith'
  ],
};

/**
 * EXPANDED_INDUSTRIAL - Higher tier production district
 */
export const EXPANDED_INDUSTRIAL_DISTRICT: DistrictDef = {
  id: 'expanded_industrial',
  name: 'Factory Complex',
  type: 'industrial',
  age: 'exploration',
  cost: 220,
  requiredTech: 'industrialization',
  populationCost: 2,
  yields: Y(0, 5, 1, 0, 0, 0, 0, 2, 0),
  adjacencyYields: Y(0, 1, 0, 0, 0, 0, 0, 0, 0),
  maxLevel: 3,
  allowedBuildings: ['workshop', 'factory', 'power_plant', 'steel_mill'],
  placementConstraint: {
    minDistanceFromCity: 1,
    maxDistanceFromCity: 4,
  },
  effects: [
    '+2 Production per adjacent Mine, Quarry, or District',
    '+4 Production if adjacent to Aqueduct',
    'Great Engineer points equal to district level × 2',
    '+2 Housing per level'
  ],
};

/**
 * EXPANDED_WATERFRONT - Higher tier harbor district
 */
export const EXPANDED_WATERFRONT_DISTRICT: DistrictDef = {
  id: 'expanded_waterfront',
  name: 'Port',
  type: 'waterfront',
  age: 'exploration',
  cost: 180,
  requiredTech: 'cartography',
  populationCost: 2,
  yields: Y(2, 2, 3, 0, 0, 0, 1, 2, 0),
  adjacencyYields: Y(0, 0, 1, 0, 0, 0, 0, 0, 0),
  maxLevel: 3,
  allowedBuildings: ['lighthouse', 'shipyard', 'seaport', 'admiralty'],
  placementConstraint: {
    mustBeOnCoast: true,
    minDistanceFromCity: 1,
    maxDistanceFromCity: 4,
  },
  effects: [
    '+2 Food from adjacent water tiles',
    '+2 Gold per adjacent water tile or District',
    'Can build advanced naval units',
    '+1 Great Admiral point per level',
    '+2 Housing per level'
  ],
};

// Barrel export
export const ALL_EXPLORATION_DISTRICTS: ReadonlyArray<DistrictDef> = [
  DOWNTOWN_DISTRICT,
  AERODROME_DISTRICT,
  PRESERVE_DISTRICT,
  EXPANDED_ENCAMPMENT_DISTRICT,
  EXPANDED_CAMPUS_DISTRICT,
  EXPANDED_THEATER_DISTRICT,
  EXPANDED_HOLY_SITE_DISTRICT,
  EXPANDED_INDUSTRIAL_DISTRICT,
  EXPANDED_WATERFRONT_DISTRICT,
];
