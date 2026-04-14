/**
 * Districts Overhaul — Cycle B compile-time + shape tests.
 *
 * Verifies that the new optional spatial fields on `CityState`
 * (`urbanTiles`, `ruralAssignments`, `quarters`) are truly optional:
 *  - A CityState constructed without them still type-checks and works.
 *  - A CityState constructed with them also type-checks and round-trips.
 *  - `urbanTiles` and `ruralAssignments` are real `Map` instances so
 *    keyed lookup by `HexKey` works as the design requires.
 *
 * These tests intentionally only use `createTestState` for the global
 * game wrapper — the CityState shape itself is what we're pinning here,
 * not any system behavior. Cycle C adds behavioral coverage.
 */

import { describe, it, expect } from 'vitest';
import type { CityState } from '../../types/GameState';
import type { HexKey } from '../../types/HexCoord';
import type {
  UrbanTileV2,
  RuralTileV2,
  QuarterV2,
} from '../../types/DistrictOverhaul';
import { createTestState } from '../../systems/__tests__/helpers';

function makeBaseCity(): CityState {
  return {
    id: 'c1',
    name: 'Rome',
    owner: 'p1',
    position: { q: 0, r: 0 },
    population: 3,
    food: 0,
    productionQueue: [],
    productionProgress: 0,
    buildings: [],
    territory: [],
    settlementType: 'city',
    happiness: 0,
    isCapital: true,
    defenseHP: 100,
    specialization: null,
    specialists: 0,
    districts: [],
  };
}

describe('Districts Overhaul Cycle B — CityState optional spatial fields', () => {
  it('constructs a minimal CityState WITHOUT the new spatial fields (back-compat)', () => {
    const city = makeBaseCity();

    // Plain legacy shape — new fields are absent / undefined.
    expect(city.urbanTiles).toBeUndefined();
    expect(city.ruralAssignments).toBeUndefined();
    expect(city.quarters).toBeUndefined();

    // And the legacy fields still exist and have the expected types.
    expect(city.id).toBe('c1');
    expect(city.population).toBe(3);
    expect(city.districts).toEqual([]);
    expect(city.buildings).toEqual([]);

    // It also plugs into the global GameState helper unchanged.
    const state = createTestState({ cities: new Map([[city.id, city]]) });
    expect(state.cities.get('c1')).toBe(city);
  });

  it('constructs a CityState WITH the new spatial fields populated', () => {
    const urbanKey: HexKey = '0,0';
    const ruralKey: HexKey = '1,0';

    const urbanTile: UrbanTileV2 = {
      cityId: 'c1',
      coord: { q: 0, r: 0 },
      buildings: ['granary'],
      specialistAssigned: false,
      walled: false,
    };

    const ruralTile: RuralTileV2 = {
      cityId: 'c1',
      coord: { q: 1, r: 0 },
      improvement: null,
      workerAssigned: true,
    };

    const quarter: QuarterV2 = {
      cityId: 'c1',
      coord: { q: 0, r: 0 },
      age: 'antiquity',
      kind: 'pure_age',
      buildingIds: ['granary', 'library'],
    };

    const city: CityState = {
      ...makeBaseCity(),
      urbanTiles: new Map<HexKey, UrbanTileV2>([[urbanKey, urbanTile]]),
      ruralAssignments: new Map<HexKey, RuralTileV2>([[ruralKey, ruralTile]]),
      quarters: [quarter],
    };

    expect(city.urbanTiles?.get(urbanKey)).toEqual(urbanTile);
    expect(city.ruralAssignments?.get(ruralKey)).toEqual(ruralTile);
    expect(city.quarters).toHaveLength(1);
    expect(city.quarters?.[0]).toEqual(quarter);

    // Legacy fields untouched.
    expect(city.buildings).toEqual([]);
    expect(city.districts).toEqual([]);

    // Round-trips through the GameState wrapper.
    const state = createTestState({ cities: new Map([[city.id, city]]) });
    const restored = state.cities.get('c1')!;
    expect(restored.urbanTiles?.size).toBe(1);
    expect(restored.ruralAssignments?.size).toBe(1);
    expect(restored.quarters?.length).toBe(1);
  });

  it('urbanTiles and ruralAssignments ARE Map instances (not POJOs)', () => {
    const city: CityState = {
      ...makeBaseCity(),
      urbanTiles: new Map<HexKey, UrbanTileV2>(),
      ruralAssignments: new Map<HexKey, RuralTileV2>(),
      quarters: [],
    };

    // Map.prototype sanity — discriminates Map from a ReadonlyArray or POJO.
    expect(city.urbanTiles).toBeInstanceOf(Map);
    expect(city.ruralAssignments).toBeInstanceOf(Map);

    // Map API is usable.
    expect(typeof city.urbanTiles?.get).toBe('function');
    expect(typeof city.ruralAssignments?.get).toBe('function');
    expect(city.urbanTiles?.size).toBe(0);
    expect(city.ruralAssignments?.size).toBe(0);

    // quarters is a plain ReadonlyArray, not a Map.
    expect(Array.isArray(city.quarters)).toBe(true);
    expect(city.quarters).not.toBeInstanceOf(Map);
  });
});
