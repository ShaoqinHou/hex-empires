/**
 * Modern Age Districts
 *
 * Most advanced districts available in the modern age.
 */

import type { DistrictDef } from '../../types/District';
import type { YieldSet } from '../../types/Yields';

const Y = (food: number, production: number, gold: number, science: number, culture: number, faith: number, influence: number, housing: number, diplomacy: number): YieldSet => ({
  food, production, gold, science, culture, faith, influence, housing, diplomacy
});

const EMPTY_YIELDS: YieldSet = Y(0, 0, 0, 0, 0, 0, 0, 0, 0);

/**
 * METROPOLIS - Ultimate city center district
 * Max level city center with massive bonuses
 */
export const METROPOLIS_DISTRICT: DistrictDef = {
  id: 'metropolis',
  name: 'Metropolis',
  type: 'city_center',
  age: 'modern',
  cost: 500,
  requiredTech: 'urbanization',
  populationCost: 0,
  yields: Y(5, 5, 3, 2, 2, 0, 2, 5, 1),
  adjacencyYields: Y(1, 1, 1, 1, 1, 0, 0, 0, 0),
  maxLevel: 5,
  allowedBuildings: ['monument', 'granary', 'shrine', 'warehouse', 'palace', 'government_building', 'courthouse'],
  effects: [
    '+2 to all yields per adjacent District',
    '+1 Housing per level',
    '+1 Amenity per level',
    'All other districts gain +1 level',
    'Unlocks all district types'
  ],
};

/**
 * SPACE_CENTER - Science victory district
 * Required for science victory
 */
export const SPACE_CENTER_DISTRICT: DistrictDef = {
  id: 'space_center',
  name: 'Space Center',
  type: 'campus',
  age: 'modern',
  cost: 600,
  requiredTech: 'rocketry',
  populationCost: 3,
  yields: Y(0, 5, 2, 8, 1, 0, 0, 1, 1),
  adjacencyYields: Y(0, 0, 0, 2, 0, 0, 0, 0, 0),
  maxLevel: 3,
  allowedBuildings: ['laboratory', 'research_lab', 'spaceport_module', 'satellite_facility'],
  placementConstraint: {
    minDistanceFromCity: 2,
    maxDistanceFromCity: 6,
  },
  effects: [
    '+3 Science per adjacent Mountain or District',
    '+50% Science output from this city',
    'Required for Science Victory projects',
    'Great Scientist points equal to district level × 3'
  ],
};

/**
 * MEDIA_CENTER - Culture and tourism district
 * Generates massive tourism
 */
export const MEDIA_CENTER_DISTRICT: DistrictDef = {
  id: 'media_center',
  name: 'Media Center',
  type: 'theater',
  age: 'modern',
  cost: 400,
  requiredTech: 'mass_media',
  populationCost: 2,
  yields: Y(0, 2, 2, 0, 6, 0, 3, 2, 0),
  adjacencyYields: Y(0, 0, 0, 0, 2, 0, 0, 0, 0),
  maxLevel: 3,
  allowedBuildings: ['museum', 'art_museum', 'archaeology_museum', 'broadcast_center', 'film_studio'],
  placementConstraint: {
    minDistanceFromCity: 1,
    maxDistanceFromCity: 4,
  },
  effects: [
    '+3 Culture per adjacent District or Wonder',
    '+2 Tourism per level',
    'Great Artist, Great Writer, and Great Musician points equal to district level × 2',
    '+25% tourism output from this city'
  ],
};

/**
 * FINANCIAL_HUB - Economic powerhouse district
 */
export const FINANCIAL_HUB_DISTRICT: DistrictDef = {
  id: 'financial_hub',
  name: 'Financial Hub',
  type: 'downtown',
  age: 'modern',
  cost: 450,
  // TODO(content): requiredCivic: 'globalization' (field-type was wrong: globalization is a CivicId not TechId)
  populationCost: 2,
  yields: Y(0, 3, 6, 1, 1, 0, 2, 3, 0),
  adjacencyYields: Y(0, 0, 2, 0, 0, 0, 0, 0, 0),
  maxLevel: 3,
  allowedBuildings: ['bank', 'stock_exchange', 'stock_market', 'world_bank', 'trade_center'],
  placementConstraint: {
    minDistanceFromCity: 1,
    maxDistanceFromCity: 5,
  },
  effects: [
    '+2 Gold per adjacent District (tripled if Commercial Hub or Downtown)',
    '+3 Housing per level',
    '+2 Influence per level',
    'Trade routes gain +100% gold bonus',
    'Great Merchant points equal to district level × 3'
  ],
};

/**
 * MILITARY_BASE - Modern military district
 */
export const MILITARY_BASE_DISTRICT: DistrictDef = {
  id: 'military_base',
  name: 'Military Base',
  type: 'encampment',
  age: 'modern',
  cost: 400,
  requiredTech: 'combined_arms',
  populationCost: 3,
  yields: Y(0, 5, 0, 1, 0, 0, 0, 3, 0),
  adjacencyYields: Y(0, 2, 0, 0, 0, 0, 0, 0, 0),
  maxLevel: 3,
  allowedBuildings: ['barracks_exp', 'stable', 'armory', 'military_academy', 'war_college', 'missile_silo'],
  placementConstraint: {
    minDistanceFromCity: 2,
    maxDistanceFromCity: 6,
  },
  effects: [
    '+3 Production per adjacent District',
    'Military units built here start with +15 XP',
    'Can build nuclear and missile units',
    'City center gains +5 Defense when adjacent',
    '+3 Housing per level'
  ],
};

/**
 * ECO_DISTRICT - Environmental district
 * Balances development with sustainability
 */
export const ECO_DISTRICT_DISTRICT: DistrictDef = {
  id: 'eco_district',
  name: 'Eco-District',
  type: 'preserve',
  age: 'modern',
  cost: 350,
  // TODO(content): requiredCivic: 'environmentalism' (field was named requiredTech but environmentalism is a CivicId)
  requiredCivic: 'environmentalism',
  populationCost: 2,
  yields: Y(3, 1, 1, 1, 3, 0, 1, 2, 2),
  adjacencyYields: Y(1, 0, 0, 0, 1, 0, 0, 0, 0),
  maxLevel: 3,
  allowedBuildings: ['park', 'sanctuary', 'national_park', 'recycling_center', 'solar_farm'],
  placementConstraint: {
    minDistanceFromCity: 1,
    maxDistanceFromCity: 4,
  },
  effects: [
    '+1 Tourism per adjacent Natural Wonder, Woods, or Rainforest',
    '+2 Appeal to all adjacent tiles',
    '+1 Housing per adjacent Woods or Rainforest',
    '+1 Food from all tiles in city territory',
    'Great Naturalist points equal to district level'
  ],
};

/**
 * DIPLOMATIC_QUARTER - Diplomatic district
 */
export const DIPLOMATIC_QUARTER_DISTRICT: DistrictDef = {
  id: 'diplomatic_quarter',
  name: 'Diplomatic Quarter',
  type: 'government',
  age: 'modern',
  cost: 400,
  // TODO(content): add requiredCivic: 'diplomacy' when civic is defined
  populationCost: 2,
  yields: Y(0, 2, 2, 1, 2, 0, 4, 2, 3),
  adjacencyYields: Y(0, 0, 0, 0, 0, 0, 1, 0, 1),
  maxLevel: 3,
  allowedBuildings: ['palace', 'government_building', 'embassy', 'diplomatic_hall', 'world_congress'],
  placementConstraint: {
    minDistanceFromCity: 1,
    maxDistanceFromCity: 4,
  },
  effects: [
    '+1 Influence per adjacent District',
    '+2 Diplomacy per level',
    '+1 Delegate per level',
    'Can form alliances more easily',
    '+2 Housing per level'
  ],
};

/**
 * MEDICAL_CENTER - Health and growth district
 */
export const MEDICAL_CENTER_DISTRICT: DistrictDef = {
  id: 'medical_center',
  name: 'Medical Center',
  type: 'entertainment',
  age: 'modern',
  cost: 350,
  // TODO(content): add requiredTech: 'pharmaceuticals' when tech is defined
  populationCost: 2,
  yields: Y(3, 1, 1, 1, 1, 0, 0, 3, 0),
  adjacencyYields: Y(1, 0, 0, 0, 0, 0, 0, 0, 0),
  maxLevel: 3,
  allowedBuildings: ['arena', 'zoo', 'stadium', 'hospital', 'medical_laboratory'],
  placementConstraint: {
    minDistanceFromCity: 1,
    maxDistanceFromCity: 4,
  },
  effects: [
    '+2 Amenity per level',
    '+3 Housing per level',
    '+50% city growth rate',
    '+1 Food per adjacent District',
    '+10% city health cap'
  ],
};

/**
 * POWER_GRID - Energy production district
 */
export const POWER_GRID_DISTRICT: DistrictDef = {
  id: 'power_grid',
  name: 'Power Grid',
  type: 'industrial',
  age: 'modern',
  cost: 500,
  requiredTech: 'electricity',
  populationCost: 3,
  yields: Y(0, 8, 2, 1, 0, 0, 0, 2, 0),
  adjacencyYields: Y(0, 2, 0, 0, 0, 0, 0, 0, 0),
  maxLevel: 3,
  allowedBuildings: ['factory', 'power_plant', 'steel_mill', 'nuclear_plant', 'hydroelectric_dam'],
  placementConstraint: {
    minDistanceFromCity: 2,
    maxDistanceFromCity: 6,
  },
  effects: [
    '+3 Production per adjacent Mine, Quarry, or District',
    '+6 Production if adjacent to River',
    'Provides power to all districts in city',
    'Great Engineer points equal to district level × 3',
    '+3 Housing per level'
  ],
};

/**
 * SACRED_GROUNDS - Modern religious district
 */
export const SACRED_GROUNDS_DISTRICT: DistrictDef = {
  id: 'sacred_grounds',
  name: 'Sacred Grounds',
  type: 'holy_site',
  age: 'modern',
  cost: 400,
  // TODO(content): add requiredCivic: 'religious_tolerance' when civic is defined
  populationCost: 2,
  yields: Y(0, 1, 1, 0, 1, 6, 0, 3, 0),
  adjacencyYields: Y(0, 0, 0, 0, 0, 2, 0, 0, 0),
  maxLevel: 3,
  allowedBuildings: ['temple', 'religious_building', 'cathedral', 'mosque', 'pagoda', 'religious_center'],
  placementConstraint: {
    minDistanceFromCity: 1,
    maxDistanceFromCity: 4,
  },
  effects: [
    '+3 Faith per adjacent Natural Wonder, Mountain, or District',
    '+2 Faith per adjacent Woods or Rainforest',
    'Great Prophet points equal to district level × 3',
    '+3 Housing per level',
    'Allows purchase of advanced religious units with Faith'
  ],
};

// Barrel export
export const ALL_MODERN_DISTRICTS: ReadonlyArray<DistrictDef> = [
  METROPOLIS_DISTRICT,
  SPACE_CENTER_DISTRICT,
  MEDIA_CENTER_DISTRICT,
  FINANCIAL_HUB_DISTRICT,
  MILITARY_BASE_DISTRICT,
  ECO_DISTRICT_DISTRICT,
  DIPLOMATIC_QUARTER_DISTRICT,
  MEDICAL_CENTER_DISTRICT,
  POWER_GRID_DISTRICT,
  SACRED_GROUNDS_DISTRICT,
];
