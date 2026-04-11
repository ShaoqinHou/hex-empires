/**
 * District System
 *
 * Districts are specialized zones on the map that contain related buildings
 * and provide adjacency bonuses. They are a core Civ VII mechanic.
 */

import type { HexCoord } from './HexCoord';
import type { BuildingId } from './Ids';
import type { YieldSet } from './Yields';

/**
 * District types determine what buildings can be placed in them
 */
export type DistrictType =
  | 'city_center'   // Main district (where city is founded)
  | 'encampment'    // Military buildings (barracks, stable, armory)
  | 'campus'        // Science buildings (library, university, laboratory)
  | 'theater'       // Culture buildings (monument, amphitheater, museum)
  | 'commercial'    // Gold buildings (market, bank, stock exchange)
  | 'industrial'    // Production buildings (workshop, factory, power plant)
  | 'holy_site'     // Religious buildings (shrine, temple, religious buildings)
  | 'government'    // Government buildings (monument, palace, government plaza)
  | 'entertainment' // Amenities buildings (arena, zoo, stadium)
  | 'aerodrome'     // Air units buildings (hangar, airport)
  | 'waterfront'    // Harbor buildings (lighthouse, shipyard, seaport)
  | 'downtown'      // Modern age specialty district
  | 'preserve';     // Tourism and appeal-based district

/**
 * District slot - represents a placed district on the map
 */
export interface DistrictSlot {
  readonly id: string;
  readonly type: DistrictType;
  readonly position: HexCoord;           // Tile where district is placed
  readonly cityId: string;               // City that owns this district
  readonly level: number;                // District level (1-3) - unlocks more buildings
  readonly buildings: ReadonlyArray<BuildingId>; // Buildings in this district
  readonly adjacencyBonus: number;       // Current adjacency bonus score
}

/**
 * District definition - data for a district type
 */
export interface DistrictDef {
  readonly id: string;
  readonly name: string;
  readonly type: DistrictType;
  readonly age: 'antiquity' | 'exploration' | 'modern';
  readonly cost: number;                 // Production cost to build
  readonly requiredTech?: string;        // Technology required to build
  readonly requiredCivic?: string;       // Civic required to build
  readonly populationCost: number;       // Population slots required
  readonly yields: YieldSet;             // Base yields provided by district
  readonly adjacencyYields: YieldSet;    // Yields per adjacency point
  readonly maxLevel: number;             // Maximum district level (usually 3)
  readonly allowedBuildings: ReadonlyArray<BuildingId>; // Buildings that can be placed here
  readonly placementConstraint?: {
    readonly mustBeOnCoast?: boolean;    // Must be adjacent to water
    readonly mustBeOnRiver?: boolean;    // Must be adjacent to river
    readonly mustBeOnHill?: boolean;     // Must be on hill terrain
    readonly mustBeOnFlat?: boolean;     // Must be on flat terrain
    readonly minDistanceFromCity?: number; // Minimum tiles from city center
    readonly maxDistanceFromCity?: number; // Maximum tiles from city center
    readonly mustBeAdjacentToDistrictType?: DistrictType[]; // Must be next to specific district
  };
  readonly effects: ReadonlyArray<string>; // Description of special effects
}

/**
 * Adjacency calculation result
 */
export interface AdjacencyResult {
  readonly score: number;
  readonly yields: YieldSet;
  readonly sources: ReadonlyArray<{
    readonly type: string;
    readonly position: HexCoord;
    readonly bonus: number;
  }>;
}
