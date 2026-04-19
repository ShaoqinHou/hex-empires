/**
 * Antiquity Age Districts
 *
 * Basic districts available in the first age.
 */

import type { DistrictDef } from '../../types/District';
import type { YieldSet } from '../../types/Yields';

// Helper to create yield sets
const Y = (food: number, production: number, gold: number, science: number, culture: number, faith: number, influence: number, happiness: number): YieldSet => ({
  food, production, gold, science, culture, faith, influence, happiness
});

// Helper to create empty yield set
const EMPTY_YIELDS: YieldSet = Y(0, 0, 0, 0, 0, 0, 0, 0);

/**
 * CITY_CENTER - The central district where the city is founded
 * Automatically created when city is founded
 */
export const CITY_CENTER_DISTRICT: DistrictDef = {
  id: 'city_center',
  name: 'City Center',
  type: 'city_center',
  age: 'antiquity',
  cost: 0,
  populationCost: 0,
  yields: Y(2, 2, 1, 0, 0, 0, 0, 1),
  adjacencyYields: EMPTY_YIELDS,
  maxLevel: 3,
  allowedBuildings: ['monument', 'granary', 'shrine', 'warehouse'],
  effects: [
    'Grants +1 Population per level',
    'Housing equal to district level',
    'All other districts must be adjacent to City Center or another district'
  ],
};

/**
 * ENCAMPMENT - Military district
 * Provides production and housing, specializes in military buildings
 */
export const ENCAMPMENT_DISTRICT: DistrictDef = {
  id: 'encampment',
  name: 'Encampment',
  type: 'encampment',
  age: 'antiquity',
  cost: 80,
  requiredTech: 'bronze_working',
  populationCost: 1,
  yields: Y(0, 2, 0, 0, 0, 0, 0, 1),
  adjacencyYields: Y(0, 0, 0, 0, 0, 0, 0, 0), // +1 production per adjacent district
  maxLevel: 2,
  allowedBuildings: ['barracks', 'stable', 'armory'],
  placementConstraint: {
    minDistanceFromCity: 1,
    maxDistanceFromCity: 3,
  },
  effects: [
    '+1 Production per adjacent district',
    'Military units built here start with +5 XP',
    'City center gains +1 Defense when adjacent'
  ],
};

/**
 * CAMPUS - Science district
 * Provides science and housing, specializes in scientific buildings
 */
export const CAMPUS_DISTRICT: DistrictDef = {
  id: 'campus',
  name: 'Campus',
  type: 'campus',
  age: 'antiquity',
  cost: 100,
  requiredTech: 'writing',
  populationCost: 1,
  yields: Y(0, 1, 0, 2, 0, 0, 0, 1),
  adjacencyYields: Y(0, 0, 0, 1, 0, 0, 0, 0), // +1 science per adjacency
  maxLevel: 2,
  allowedBuildings: ['library', 'university'],
  placementConstraint: {
    minDistanceFromCity: 1,
    maxDistanceFromCity: 4,
  },
  effects: [
    '+1 Science per adjacent Mountain or District',
    '+1 Science per 2 adjacent Rainforest tiles',
    'Great Scientist points equal to district level'
  ],
};

/**
 * THEATER - Culture district
 * Provides culture and housing, specializes in cultural buildings
 */
export const THEATER_DISTRICT: DistrictDef = {
  id: 'theater',
  name: 'Theater Square',
  type: 'theater',
  age: 'antiquity',
  cost: 100,
  // TODO(content): add requiredCivic: 'drama_poetry' when civic is defined
  populationCost: 1,
  yields: Y(0, 1, 0, 0, 2, 0, 0, 1),
  adjacencyYields: Y(0, 0, 0, 0, 1, 0, 0, 0), // +1 culture per adjacency
  maxLevel: 2,
  allowedBuildings: ['monument', 'amphitheater', 'museum'],
  placementConstraint: {
    minDistanceFromCity: 1,
    maxDistanceFromCity: 4,
  },
  effects: [
    '+1 Culture per adjacent District or Wonder',
    '+1 Culture per adjacent Natural Wonder',
    'Great Artist and Great Writer points equal to district level'
  ],
};

/**
 * COMMERCIAL - Gold district
 * Provides gold and housing, specializes in economic buildings
 */
export const COMMERCIAL_DISTRICT: DistrictDef = {
  id: 'commercial',
  name: 'Commercial Hub',
  type: 'commercial',
  age: 'antiquity',
  cost: 80,
  requiredCivic: 'state_workforce',
  populationCost: 1,
  yields: Y(0, 1, 2, 0, 0, 0, 0, 1),
  adjacencyYields: Y(0, 0, 1, 0, 0, 0, 0, 0), // +1 gold per adjacency
  maxLevel: 2,
  allowedBuildings: ['market', 'bank'],
  placementConstraint: {
    minDistanceFromCity: 1,
    maxDistanceFromCity: 4,
  },
  effects: [
    '+1 Gold per adjacent River, District, or Commercial Hub',
    'Trade routes originating from this city gain +1 Gold',
    'Great Merchant points equal to district level'
  ],
};

/**
 * INDUSTRIAL - Production district
 * Provides production and housing, specializes in industrial buildings
 */
export const INDUSTRIAL_DISTRICT: DistrictDef = {
  id: 'industrial',
  name: 'Industrial Zone',
  type: 'industrial',
  age: 'antiquity',
  cost: 100,
  // TODO(content): add requiredTech: 'apprenticeship' when age-coherent tech is confirmed
  populationCost: 1,
  yields: Y(0, 3, 0, 0, 0, 0, 0, 1),
  adjacencyYields: Y(0, 1, 0, 0, 0, 0, 0, 0), // +1 production per adjacency
  maxLevel: 2,
  allowedBuildings: ['workshop', 'factory'],
  placementConstraint: {
    minDistanceFromCity: 1,
    maxDistanceFromCity: 4,
  },
  effects: [
    '+1 Production per adjacent Mine, Quarry, or District',
    '+2 Production if adjacent to Aqueduct',
    'Great Engineer points equal to district level'
  ],
};

/**
 * HOLY_SITE - Faith district
 * Provides faith and housing, specializes in religious buildings
 */
export const HOLY_SITE_DISTRICT: DistrictDef = {
  id: 'holy_site',
  name: 'Holy Site',
  type: 'holy_site',
  age: 'antiquity',
  cost: 100,
  // TODO(content): add requiredCivic: 'theology' when civic is defined
  populationCost: 1,
  yields: Y(0, 0, 0, 0, 0, 2, 0, 1),
  adjacencyYields: Y(0, 0, 0, 0, 0, 1, 0, 0), // +1 faith per adjacency
  maxLevel: 2,
  allowedBuildings: ['shrine', 'temple', 'religious_building'],
  placementConstraint: {
    minDistanceFromCity: 1,
    maxDistanceFromCity: 4,
  },
  effects: [
    '+1 Faith per adjacent Natural Wonder, Mountain, or District',
    '+1 Faith per 2 adjacent Woods tiles',
    'Great Prophet points equal to district level'
  ],
};

/**
 * GOVERNMENT - Administration district
 * Provides amenities and governance buildings
 */
export const GOVERNMENT_DISTRICT: DistrictDef = {
  id: 'government',
  name: 'Government Plaza',
  type: 'government',
  age: 'antiquity',
  cost: 120,
  requiredCivic: 'code_of_laws',
  populationCost: 1,
  yields: Y(0, 1, 1, 0, 1, 0, 0, 1),
  adjacencyYields: EMPTY_YIELDS,
  maxLevel: 2,
  allowedBuildings: ['monument', 'palace', 'government_building'],
  placementConstraint: {
    minDistanceFromCity: 1,
    maxDistanceFromCity: 3,
  },
  effects: [
    '+1 to all yields per adjacent District',
    'Provides +1 Housing per level',
    'Grants 1 Governor title'
  ],
};

/**
 * ENTERTAINMENT - Amenities district
 * Provides housing and amenities
 */
export const ENTERTAINMENT_DISTRICT: DistrictDef = {
  id: 'entertainment',
  name: 'Entertainment Complex',
  type: 'entertainment',
  age: 'antiquity',
  cost: 100,
  // TODO(content): add requiredCivic: 'games_recreation' when civic is defined
  populationCost: 1,
  yields: Y(0, 1, 1, 0, 1, 0, 0, 2),
  adjacencyYields: Y(0, 0, 0, 0, 1, 0, 0, 0), // +1 culture per adjacency
  maxLevel: 2,
  allowedBuildings: ['arena', 'zoo', 'stadium'],
  placementConstraint: {
    minDistanceFromCity: 1,
    maxDistanceFromCity: 4,
  },
  effects: [
    '+1 Amenity per level',
    '+1 Housing per level',
    '+1 Culture per adjacent District or Entertainment Complex'
  ],
};

/**
 * WATERFRONT - Harbor district
 * Provides gold and food, must be on coast
 */
export const WATERFRONT_DISTRICT: DistrictDef = {
  id: 'waterfront',
  name: 'Waterfront',
  type: 'waterfront',
  age: 'antiquity',
  cost: 80,
  requiredTech: 'sailing',
  populationCost: 1,
  yields: Y(1, 1, 2, 0, 0, 0, 0, 1),
  adjacencyYields: Y(0, 0, 1, 0, 0, 0, 0, 0), // +1 gold per adjacent water
  maxLevel: 2,
  allowedBuildings: ['lighthouse', 'shipyard', 'seaport'],
  placementConstraint: {
    mustBeOnCoast: true,
    minDistanceFromCity: 1,
    maxDistanceFromCity: 4,
  },
  effects: [
    '+1 Food from adjacent water tiles',
    '+1 Gold per adjacent water tile or District',
    'Can build naval units',
    '+1 Housing per level'
  ],
};

// Barrel export
export const ALL_ANTIQUITY_DISTRICTS: ReadonlyArray<DistrictDef> = [
  CITY_CENTER_DISTRICT,
  ENCAMPMENT_DISTRICT,
  CAMPUS_DISTRICT,
  THEATER_DISTRICT,
  COMMERCIAL_DISTRICT,
  INDUSTRIAL_DISTRICT,
  HOLY_SITE_DISTRICT,
  GOVERNMENT_DISTRICT,
  ENTERTAINMENT_DISTRICT,
  WATERFRONT_DISTRICT,
];
