import { describe, it, expect } from 'vitest';
import { urbanBuildingSystem } from '../urbanBuildingSystem';
import { createTestState, createTestPlayer, setTile } from './helpers';
import type { CityState, HexTile, GameState } from '../../types/GameState';
import type { PlaceUrbanBuildingActionV2 } from '../../types/DistrictOverhaul';
import type { QuarterDef } from '../../types/Quarter';
import type { BuildingDef } from '../../types/Building';
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
    expect(urban.specialistCount).toBe(0);
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
            specialistCount: 0,
            specialistCapPerTile: 1,
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
            specialistCount: 0,
            specialistCapPerTile: 1,
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
            specialistCount: 0,
            specialistCapPerTile: 1,
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
            specialistCount: 0,
            specialistCapPerTile: 1,
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

  // ── M14 BuildingPlacementValidator gating (wonder placement rules) ──

  it('still places a non-wonder (granary) on a valid grassland territory tile', () => {
    const city = createTestCity();
    const state = createTestState({ cities: new Map([['c1', city]]) });
    const tile = { q: 4, r: 3 };

    const next = urbanBuildingSystem(state, {
      type: 'PLACE_URBAN_BUILDING',
      cityId: 'c1',
      tile,
      buildingId: 'granary',
    });

    const urban = next.cities.get('c1')!.urbanTiles!.get(coordToKey(tile))!;
    expect(urban.buildings).toEqual(['granary']);
  });

  it('places Pyramids on a desert tile', () => {
    const city = createTestCity();
    const baseState = createTestState({ cities: new Map([['c1', city]]) });
    const tiles = new Map<string, HexTile>(baseState.map.tiles);
    const tile = { q: 4, r: 3 };
    setTile(tiles, tile, 'desert', null);
    const state = { ...baseState, map: { ...baseState.map, tiles } };

    const next = urbanBuildingSystem(state, {
      type: 'PLACE_URBAN_BUILDING',
      cityId: 'c1',
      tile,
      buildingId: 'pyramids',
    });

    const urban = next.cities.get('c1')!.urbanTiles!.get(coordToKey(tile))!;
    expect(urban.buildings).toEqual(['pyramids']);
  });

  it('rejects Pyramids on a grassland tile (wonder placement predicate fails)', () => {
    const city = createTestCity();
    // Default map is all grassland → Pyramids (desert/floodplains-only) must fail.
    const state = createTestState({ cities: new Map([['c1', city]]) });
    const tile = { q: 4, r: 3 };

    const next = urbanBuildingSystem(state, {
      type: 'PLACE_URBAN_BUILDING',
      cityId: 'c1',
      tile,
      buildingId: 'pyramids',
    });

    expect(next).toBe(state);
  });

  it('places Stonehenge on a tile adjacent to a stone resource', () => {
    const city = createTestCity();
    const baseState = createTestState({ cities: new Map([['c1', city]]) });
    const tiles = new Map<string, HexTile>(baseState.map.tiles);
    const placementTile = { q: 4, r: 3 };
    // Put a 'stone' resource on a neighbour of the placement tile.
    // Neighbours of {4,3} include {4,2} (see hex neighbour axial offsets).
    const neighbour = { q: 4, r: 2 };
    const nKey = coordToKey(neighbour);
    const nExisting = tiles.get(nKey)!;
    tiles.set(nKey, { ...nExisting, resource: 'stone' });
    const state = { ...baseState, map: { ...baseState.map, tiles } };

    const next = urbanBuildingSystem(state, {
      type: 'PLACE_URBAN_BUILDING',
      cityId: 'c1',
      tile: placementTile,
      buildingId: 'stonehenge',
    });

    const urban = next.cities.get('c1')!.urbanTiles!.get(coordToKey(placementTile))!;
    expect(urban.buildings).toEqual(['stonehenge']);
  });

  it('rejects Stonehenge when no adjacent tile has a stone resource', () => {
    const city = createTestCity();
    // Default map has no resources anywhere → Stonehenge must fail.
    const state = createTestState({ cities: new Map([['c1', city]]) });
    const tile = { q: 4, r: 3 };

    const next = urbanBuildingSystem(state, {
      type: 'PLACE_URBAN_BUILDING',
      cityId: 'c1',
      tile,
      buildingId: 'stonehenge',
    });

    expect(next).toBe(state);
  });
});

// ── W3-01: Quarter detection — unique_quarter, ageless_pair ──────────────────

/**
 * Build a minimal state configured for quarter-detection tests.
 * Injects synthetic buildings and a QuarterDef so tests do not depend on
 * real catalog buildings (parthenon, odeon, etc.) existing in the content data.
 */
function buildQuarterTestState(
  extraBuildings: BuildingDef[],
  quarterDefs: QuarterDef[],
  ownerCivId: string = 'greece',
): GameState {
  const tile = { q: 4, r: 3 };
  const tileKey = coordToKey(tile);

  const city: CityState = {
    id: 'c1',
    name: 'Athens',
    owner: 'p1',
    position: { q: 3, r: 3 },
    population: 5,
    food: 0,
    productionQueue: [],
    productionProgress: 0,
    buildings: [],
    territory: [
      tileKey,
      coordToKey({ q: 3, r: 3 }),
      coordToKey({ q: 3, r: 4 }),
    ],
    settlementType: 'city',
    happiness: 10,
    isCapital: true,
    defenseHP: 100,
    specialization: null,
    specialists: 0,
    districts: [],
  };

  const base = createTestState({
    players: new Map([['p1', createTestPlayer({ id: 'p1', name: 'P1', civilizationId: ownerCivId as unknown as import('../../types/Ids').CivilizationId })]]),
    cities: new Map([['c1', city]]),
  });

  // Extend config with synthetic buildings + quarters.
  const extendedBuildings = new Map(base.config.buildings);
  for (const b of extraBuildings) extendedBuildings.set(b.id, b);

  const quartersMap = new Map<string, QuarterDef>(base.config.quarters ?? []);
  for (const q of quarterDefs) quartersMap.set(q.id, q);

  return {
    ...base,
    config: {
      ...base.config,
      buildings: extendedBuildings,
      quarters: quartersMap,
    },
  };
}

describe('urbanBuildingSystem — W3-01 quarter detection', () => {
  const PARTHENON: BuildingDef = {
    id: 'parthenon',
    name: 'Parthenon',
    age: 'antiquity',
    cost: 200,
    maintenance: 1,
    yields: { culture: 3 },
    effects: [],
    requiredTech: null,
    isCivUnique: true,
    civId: 'greece',
  } as const;

  const ODEON: BuildingDef = {
    id: 'odeon',
    name: 'Odeon',
    age: 'antiquity',
    cost: 180,
    maintenance: 1,
    yields: { culture: 2 },
    effects: [],
    requiredTech: null,
    isCivUnique: true,
    civId: 'greece',
  } as const;

  const ACROPOLIS_DEF: QuarterDef = {
    id: 'acropolis',
    name: 'Acropolis',
    civId: 'greece',
    requiredBuildings: ['parthenon', 'odeon'],
    bonusEffect: { type: 'MODIFY_YIELD', target: 'city', yield: 'culture', value: 2 },
  } as const;

  it('detects unique_quarter when both civ-unique buildings match the catalog (Greece ACROPOLIS)', () => {
    const tile = { q: 4, r: 3 };
    const tileKey = coordToKey(tile);

    // First, place parthenon on the tile.
    const state1 = buildQuarterTestState([PARTHENON, ODEON], [ACROPOLIS_DEF]);
    const state2 = urbanBuildingSystem(state1, {
      type: 'PLACE_URBAN_BUILDING',
      cityId: 'c1',
      tile,
      buildingId: 'parthenon',
    });

    // Then place odeon — should trigger unique_quarter.
    const state3 = urbanBuildingSystem(state2, {
      type: 'PLACE_URBAN_BUILDING',
      cityId: 'c1',
      tile,
      buildingId: 'odeon',
    });

    const nextCity = state3.cities.get('c1')!;
    expect(nextCity.quarters).toBeDefined();
    expect(nextCity.quarters!.length).toBe(1);
    const q = nextCity.quarters![0];
    expect(q.kind).toBe('unique_quarter');
    expect(q.quarterId).toBe('acropolis');
    expect(q.coord).toEqual(tile);
    expect(q.buildingIds).toContain('parthenon');
    expect(q.buildingIds).toContain('odeon');
  });

  it('does NOT form unique_quarter when the same buildings are placed by a non-Greece civ (civ-lock)', () => {
    const tile = { q: 4, r: 3 };

    // Player owns 'rome' civ — not 'greece', so ACROPOLIS civId mismatch.
    const state1 = buildQuarterTestState([PARTHENON, ODEON], [ACROPOLIS_DEF], 'rome');
    const state2 = urbanBuildingSystem(state1, {
      type: 'PLACE_URBAN_BUILDING',
      cityId: 'c1',
      tile,
      buildingId: 'parthenon',
    });
    const state3 = urbanBuildingSystem(state2, {
      type: 'PLACE_URBAN_BUILDING',
      cityId: 'c1',
      tile,
      buildingId: 'odeon',
    });

    const nextCity = state3.cities.get('c1')!;
    // Neither unique_quarter nor pure_age (same age antiquity) — wait,
    // these ARE same-age antiquity so pure_age would fire.
    // But unique_quarter is checked FIRST, so the test is really that
    // the civ-lock prevented unique_quarter, not pure_age.
    // The buildings are same age so pure_age will fire instead.
    expect(nextCity.quarters).toBeDefined();
    expect(nextCity.quarters!.length).toBe(1);
    const q = nextCity.quarters![0];
    expect(q.kind).toBe('pure_age');  // same age, but NOT unique_quarter
    expect(q.quarterId).toBeNull();   // no named quarter
  });

  it('detects ageless_pair when both buildings have isAgeless=true', () => {
    const AGELESS_A: BuildingDef = {
      id: 'test_ageless_a',
      name: 'Test Ageless A',
      age: 'antiquity',
      cost: 300,
      maintenance: 0,
      yields: {},
      effects: [],
      requiredTech: null,
      isAgeless: true,
    } as const;

    const AGELESS_B: BuildingDef = {
      id: 'test_ageless_b',
      name: 'Test Ageless B',
      age: 'exploration',  // different age — but ageless pair overrides age check
      cost: 300,
      maintenance: 0,
      yields: {},
      effects: [],
      requiredTech: null,
      isAgeless: true,
    } as const;

    const tile = { q: 4, r: 3 };
    const state1 = buildQuarterTestState([AGELESS_A, AGELESS_B], []);
    const state2 = urbanBuildingSystem(state1, {
      type: 'PLACE_URBAN_BUILDING',
      cityId: 'c1',
      tile,
      buildingId: 'test_ageless_a',
    });
    const state3 = urbanBuildingSystem(state2, {
      type: 'PLACE_URBAN_BUILDING',
      cityId: 'c1',
      tile,
      buildingId: 'test_ageless_b',
    });

    const nextCity = state3.cities.get('c1')!;
    expect(nextCity.quarters).toBeDefined();
    expect(nextCity.quarters!.length).toBe(1);
    const q = nextCity.quarters![0];
    expect(q.kind).toBe('ageless_pair');
    expect(q.age).toBe('ageless');
    expect(q.quarterId).toBeNull();
  });

  it('detects pure_age when both buildings are same-age non-ageless (existing behavior unchanged)', () => {
    const tile = { q: 4, r: 3 };
    const tileKey = coordToKey(tile);
    const city: CityState = {
      id: 'c1',
      name: 'Rome',
      owner: 'p1',
      position: { q: 3, r: 3 },
      population: 5,
      food: 0,
      productionQueue: [],
      productionProgress: 0,
      buildings: [],
      territory: [tileKey, coordToKey({ q: 3, r: 3 })],
      settlementType: 'city',
      happiness: 10,
      isCapital: true,
      defenseHP: 100,
      specialization: null,
      specialists: 0,
      districts: [],
      urbanTiles: new Map([[
        tileKey,
        {
          cityId: 'c1' as const,
          coord: tile,
          buildings: ['granary' as const],
          specialistCount: 0,
          specialistCapPerTile: 1,
          walled: false,
        },
      ]]),
      quarters: [],
    };
    const state = createTestState({ cities: new Map([['c1', city]]) });

    const next = urbanBuildingSystem(state, {
      type: 'PLACE_URBAN_BUILDING',
      cityId: 'c1',
      tile,
      buildingId: 'monument',  // also antiquity
    });

    const q = next.cities.get('c1')!.quarters![0];
    expect(q.kind).toBe('pure_age');
    expect(q.age).toBe('antiquity');
    expect(q.quarterId).toBeNull();
  });

  it('returns null quarter (no entry) for mixed-age non-ageless non-unique pairing', () => {
    const tile = { q: 4, r: 3 };
    const tileKey = coordToKey(tile);
    const city: CityState = {
      id: 'c1',
      name: 'Rome',
      owner: 'p1',
      position: { q: 3, r: 3 },
      population: 5,
      food: 0,
      productionQueue: [],
      productionProgress: 0,
      buildings: [],
      territory: [tileKey, coordToKey({ q: 3, r: 3 })],
      settlementType: 'city',
      happiness: 10,
      isCapital: true,
      defenseHP: 100,
      specialization: null,
      specialists: 0,
      districts: [],
      urbanTiles: new Map([[
        tileKey,
        {
          cityId: 'c1' as const,
          coord: tile,
          buildings: ['granary' as const],   // antiquity
          specialistCount: 0,
          specialistCapPerTile: 1,
          walled: false,
        },
      ]]),
      quarters: [],
    };
    const state = createTestState({ cities: new Map([['c1', city]]) });

    const next = urbanBuildingSystem(state, {
      type: 'PLACE_URBAN_BUILDING',
      cityId: 'c1',
      tile,
      buildingId: 'bank',   // exploration
    });

    // Placement succeeds but no quarter recorded.
    const nextCity = next.cities.get('c1')!;
    expect(nextCity.quarters).toEqual([]);
    expect(nextCity.urbanTiles!.get(tileKey)!.buildings).toContain('bank');
  });

  it('ACROPOLIS bonusEffect is accessible via state.config.quarters for yield application', () => {
    // Verify the config pipeline: quarters map is populated and bonusEffect correct.
    const state = buildQuarterTestState([PARTHENON, ODEON], [ACROPOLIS_DEF]);
    const acropolisDef = state.config.quarters?.get('acropolis');
    expect(acropolisDef).toBeDefined();
    expect(acropolisDef!.bonusEffect).toEqual({
      type: 'MODIFY_YIELD',
      target: 'city',
      yield: 'culture',
      value: 2,
    });
  });
});
