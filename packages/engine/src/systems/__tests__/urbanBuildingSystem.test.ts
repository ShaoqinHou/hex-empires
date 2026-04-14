import { describe, it, expect } from 'vitest';
import { urbanBuildingSystem } from '../urbanBuildingSystem';
import { createTestState } from './helpers';
import type { CityState } from '../../types/GameState';
import type { PlaceUrbanBuildingActionV2 } from '../../types/DistrictOverhaul';
import { coordToKey } from '../../hex/HexMath';

/**
 * Tests for the Districts Overhaul Cycle C `urbanBuildingSystem`.
 *
 * Covers:
 *  - identity for unrelated actions
 *  - happy-path placement updates `city.urbanTiles`
 *  - validation rejections (missing city, foreign owner, unknown building,
 *    off-territory tile, full tile)
 *  - Quarter derivation on the 2nd building:
 *      same age → quarters grows by 1
 *      different age → quarters unchanged
 */

function createTestCity(overrides: Partial<CityState> = {}): CityState {
  return {
    id: 'c1',
    name: 'Rome',
    owner: 'p1',
    position: { q: 3, r: 3 },
    population: 5,
    food: 0,
    productionQueue: [],
    productionProgress: 0,
    buildings: [],
    territory: [
      coordToKey({ q: 3, r: 3 }),
      coordToKey({ q: 4, r: 3 }),
      coordToKey({ q: 3, r: 4 }),
      coordToKey({ q: 2, r: 4 }),
      coordToKey({ q: 2, r: 3 }),
    ],
    settlementType: 'city',
    happiness: 10,
    isCapital: true,
    defenseHP: 100,
    specialization: null,
    specialists: 0,
    districts: [],
    ...overrides,
  };
}

describe('urbanBuildingSystem', () => {
  it('returns state reference unchanged for non-matching actions', () => {
    const city = createTestCity();
    const state = createTestState({ cities: new Map([['c1', city]]) });
    const next = urbanBuildingSystem(state, { type: 'END_TURN' });
    expect(next).toBe(state);
  });

  it('returns identity for START_TURN', () => {
    const state = createTestState();
    const next = urbanBuildingSystem(state, { type: 'START_TURN' });
    expect(next).toBe(state);
  });

  it('places a building on a territory tile and creates an urbanTiles entry', () => {
    const city = createTestCity();
    const state = createTestState({ cities: new Map([['c1', city]]) });
    const tile = { q: 4, r: 3 };

    const action: PlaceUrbanBuildingActionV2 = {
      type: 'PLACE_URBAN_BUILDING',
      cityId: 'c1',
      tile,
      buildingId: 'granary',
    };
    const next = urbanBuildingSystem(state, action);

    const nextCity = next.cities.get('c1')!;
    expect(nextCity.urbanTiles).toBeDefined();
    const urban = nextCity.urbanTiles!.get(coordToKey(tile))!;
    expect(urban.buildings).toEqual(['granary']);
    expect(urban.cityId).toBe('c1');
    expect(urban.coord).toEqual(tile);
    expect(urban.specialistAssigned).toBe(false);
    expect(urban.walled).toBe(false);
  });

  it('does not mutate the original state when placing', () => {
    const city = createTestCity();
    const state = createTestState({ cities: new Map([['c1', city]]) });
    const tile = { q: 4, r: 3 };

    urbanBuildingSystem(state, {
      type: 'PLACE_URBAN_BUILDING',
      cityId: 'c1',
      tile,
      buildingId: 'granary',
    });

    expect(state.cities.get('c1')!.urbanTiles).toBeUndefined();
  });

  it('returns identity when cityId is unknown', () => {
    const city = createTestCity();
    const state = createTestState({ cities: new Map([['c1', city]]) });

    const next = urbanBuildingSystem(state, {
      type: 'PLACE_URBAN_BUILDING',
      cityId: 'c-missing',
      tile: { q: 4, r: 3 },
      buildingId: 'granary',
    });

    expect(next).toBe(state);
  });

  it('returns identity when city is owned by another player', () => {
    const city = createTestCity({ owner: 'p2' });
    const state = createTestState({ cities: new Map([['c1', city]]) });

    const next = urbanBuildingSystem(state, {
      type: 'PLACE_URBAN_BUILDING',
      cityId: 'c1',
      tile: { q: 4, r: 3 },
      buildingId: 'granary',
    });

    expect(next).toBe(state);
  });

  it('returns identity when buildingId is not in config', () => {
    const city = createTestCity();
    const state = createTestState({ cities: new Map([['c1', city]]) });

    const next = urbanBuildingSystem(state, {
      type: 'PLACE_URBAN_BUILDING',
      cityId: 'c1',
      tile: { q: 4, r: 3 },
      buildingId: 'no-such-building',
    });

    expect(next).toBe(state);
  });

  it('returns identity when the tile already holds 2 buildings', () => {
    const tile = { q: 4, r: 3 };
    const tileKey = coordToKey(tile);
    const city = createTestCity({
      urbanTiles: new Map([
        [
          tileKey,
          {
            cityId: 'c1' as const,
            coord: tile,
            buildings: ['granary' as const, 'monument' as const],
            specialistAssigned: false,
            walled: false,
          },
        ],
      ]),
      quarters: [],
    });
    const state = createTestState({ cities: new Map([['c1', city]]) });

    const next = urbanBuildingSystem(state, {
      type: 'PLACE_URBAN_BUILDING',
      cityId: 'c1',
      tile,
      buildingId: 'library',
    });

    expect(next).toBe(state);
  });

  it('appends a 2nd building on the same tile', () => {
    const tile = { q: 4, r: 3 };
    const tileKey = coordToKey(tile);
    const city = createTestCity({
      urbanTiles: new Map([
        [
          tileKey,
          {
            cityId: 'c1' as const,
            coord: tile,
            buildings: ['granary' as const],
            specialistAssigned: false,
            walled: false,
          },
        ],
      ]),
      quarters: [],
    });
    const state = createTestState({ cities: new Map([['c1', city]]) });

    const next = urbanBuildingSystem(state, {
      type: 'PLACE_URBAN_BUILDING',
      cityId: 'c1',
      tile,
      buildingId: 'monument',
    });

    const nextUrban = next.cities.get('c1')!.urbanTiles!.get(tileKey)!;
    expect(nextUrban.buildings).toEqual(['granary', 'monument']);
  });

  it('grows quarters by 1 when 2nd same-age building lands on tile', () => {
    const tile = { q: 4, r: 3 };
    const tileKey = coordToKey(tile);
    const city = createTestCity({
      urbanTiles: new Map([
        [
          tileKey,
          {
            cityId: 'c1' as const,
            coord: tile,
            buildings: ['granary' as const], // antiquity
            specialistAssigned: false,
            walled: false,
          },
        ],
      ]),
      quarters: [],
    });
    const state = createTestState({ cities: new Map([['c1', city]]) });

    const next = urbanBuildingSystem(state, {
      type: 'PLACE_URBAN_BUILDING',
      cityId: 'c1',
      tile,
      buildingId: 'monument', // antiquity
    });

    const nextCity = next.cities.get('c1')!;
    expect(nextCity.quarters).toBeDefined();
    expect(nextCity.quarters!.length).toBe(1);
    const q = nextCity.quarters![0];
    expect(q.kind).toBe('pure_age');
    expect(q.coord).toEqual(tile);
    expect(q.age).toBe('antiquity');
    expect(q.buildingIds).toEqual(['granary', 'monument']);
  });

  it('leaves quarters unchanged when 2nd different-age building lands on tile', () => {
    const tile = { q: 4, r: 3 };
    const tileKey = coordToKey(tile);
    const city = createTestCity({
      urbanTiles: new Map([
        [
          tileKey,
          {
            cityId: 'c1' as const,
            coord: tile,
            buildings: ['granary' as const], // antiquity
            specialistAssigned: false,
            walled: false,
          },
        ],
      ]),
      quarters: [],
    });
    const state = createTestState({ cities: new Map([['c1', city]]) });

    const next = urbanBuildingSystem(state, {
      type: 'PLACE_URBAN_BUILDING',
      cityId: 'c1',
      tile,
      buildingId: 'bank', // exploration
    });

    const nextCity = next.cities.get('c1')!;
    expect(nextCity.quarters).toEqual([]);
    // Placement itself still succeeded:
    const nextUrban = nextCity.urbanTiles!.get(tileKey)!;
    expect(nextUrban.buildings).toEqual(['granary', 'bank']);
  });

  it('flags walled=true when a Walls building is placed on the tile', () => {
    const city = createTestCity();
    const state = createTestState({ cities: new Map([['c1', city]]) });
    const tile = { q: 4, r: 3 };

    const next = urbanBuildingSystem(state, {
      type: 'PLACE_URBAN_BUILDING',
      cityId: 'c1',
      tile,
      buildingId: 'walls',
    });

    const urban = next.cities.get('c1')!.urbanTiles!.get(coordToKey(tile))!;
    expect(urban.walled).toBe(true);
  });

  it('rejects placement on a tile outside territory and beyond work range', () => {
    const city = createTestCity();
    const state = createTestState({ cities: new Map([['c1', city]]) });
    // city.position = {3,3}, work range fallback = 3 hexes; {9,9} is far away.
    const next = urbanBuildingSystem(state, {
      type: 'PLACE_URBAN_BUILDING',
      cityId: 'c1',
      tile: { q: 9, r: 9 },
      buildingId: 'granary',
    });

    expect(next).toBe(state);
  });
});
