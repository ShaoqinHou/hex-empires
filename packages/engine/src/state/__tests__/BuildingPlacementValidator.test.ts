import { describe, it, expect } from 'vitest';
import {
  validateBuildingPlacement,
  listValidBuildingsForTile,
  listValidTilesForBuilding,
} from '../BuildingPlacementValidator';
import { createTestState } from '../../systems/__tests__/helpers';
import type { GameState, CityState, HexTile } from '../../types/GameState';
import type { UrbanTileV2 } from '../../types/DistrictOverhaul';
import type { HexCoord } from '../../types/HexCoord';
import { coordToKey } from '../../hex/HexMath';

/**
 * Tests for BuildingPlacementValidator — the standalone pre-flight helper
 * stacking urbanBuildingSystem's core checks with wonderPlacementSystem's
 * geographic rules. The validator is pure; these tests assert only its
 * inputs → outputs.
 */

function makeCity(overrides: Partial<CityState> = {}): CityState {
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

function withTerrain(
  state: GameState,
  coord: HexCoord,
  terrain: string,
  feature: string | null = null,
): GameState {
  const tiles = new Map(state.map.tiles);
  const key = coordToKey(coord);
  const existing = tiles.get(key);
  if (!existing) return state;
  const next: HexTile = { ...existing, terrain, feature };
  tiles.set(key, next);
  return { ...state, map: { ...state.map, tiles } };
}

describe('validateBuildingPlacement — ownership / existence', () => {
  it('rejects unknown city with "city" in reason', () => {
    const state = createTestState();
    const result = validateBuildingPlacement(
      'c-nope',
      { q: 3, r: 3 },
      'granary',
      state,
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toBeDefined();
    expect(result.reason!.toLowerCase()).toContain('city');
  });

  it('rejects city owned by another player', () => {
    const city = makeCity({ owner: 'p2' });
    const state = createTestState({ cities: new Map([['c1', city]]) });
    const result = validateBuildingPlacement(
      'c1',
      { q: 3, r: 3 },
      'granary',
      state,
    );
    expect(result.valid).toBe(false);
    expect(result.reason!.toLowerCase()).toContain('city');
  });

  it('rejects unknown building id with "building" in reason', () => {
    const city = makeCity();
    const state = createTestState({ cities: new Map([['c1', city]]) });
    const result = validateBuildingPlacement(
      'c1',
      { q: 3, r: 3 },
      'not_a_real_building',
      state,
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toBeDefined();
    expect(result.reason!.toLowerCase()).toContain('building');
  });
});

describe('validateBuildingPlacement — territory / tile cap', () => {
  it('rejects a tile outside both territory and work-range fallback', () => {
    // City at (3,3); tile at (9,9) is > 3 hexes away and not in territory.
    const city = makeCity({ territory: [coordToKey({ q: 3, r: 3 })] });
    const state = createTestState({ cities: new Map([['c1', city]]) });
    const result = validateBuildingPlacement(
      'c1',
      { q: 9, r: 9 },
      'granary',
      state,
    );
    expect(result.valid).toBe(false);
    expect(result.reason!.toLowerCase()).toContain('territory');
  });

  it('rejects a tile that already hosts 2 buildings (urban cap)', () => {
    const tile = { q: 4, r: 3 };
    const urbanTiles = new Map<string, UrbanTileV2>();
    urbanTiles.set(coordToKey(tile), {
      cityId: 'c1',
      coord: tile,
      buildings: ['granary', 'barracks'],
      specialistCount: 0,
      specialistCapPerTile: 1,
      walled: false,
    });
    const city = makeCity({ urbanTiles });
    const state = createTestState({ cities: new Map([['c1', city]]) });
    const result = validateBuildingPlacement('c1', tile, 'monument', state);
    expect(result.valid).toBe(false);
    expect(result.reason!.toLowerCase()).toContain('cap');
  });

  it('accepts a non-wonder building on an in-territory empty tile', () => {
    const city = makeCity();
    const state = createTestState({ cities: new Map([['c1', city]]) });
    const result = validateBuildingPlacement(
      'c1',
      { q: 4, r: 3 },
      'granary',
      state,
    );
    expect(result.valid).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it('accepts a tile with only 1 existing building', () => {
    const tile = { q: 4, r: 3 };
    const urbanTiles = new Map<string, UrbanTileV2>();
    urbanTiles.set(coordToKey(tile), {
      cityId: 'c1',
      coord: tile,
      buildings: ['granary'],
      specialistCount: 0,
      specialistCapPerTile: 1,
      walled: false,
    });
    const city = makeCity({ urbanTiles });
    const state = createTestState({ cities: new Map([['c1', city]]) });
    const result = validateBuildingPlacement('c1', tile, 'monument', state);
    expect(result.valid).toBe(true);
  });
});

describe('validateBuildingPlacement — wonder gating', () => {
  it('rejects pyramids on grassland (default) with placement-related reason', () => {
    const city = makeCity();
    const state = createTestState({ cities: new Map([['c1', city]]) });
    // (4,3) is grassland by default → pyramids rule requires desert/floodplains.
    const result = validateBuildingPlacement(
      'c1',
      { q: 4, r: 3 },
      'pyramids',
      state,
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toBeDefined();
    // Reason is propagated from isWonderPlacementValid which embeds wonder id.
    expect(result.reason!.toLowerCase()).toContain('placement');
  });

  it('accepts pyramids when placed on desert inside city territory', () => {
    const city = makeCity();
    let state = createTestState({ cities: new Map([['c1', city]]) });
    state = withTerrain(state, { q: 4, r: 3 }, 'desert');
    const result = validateBuildingPlacement(
      'c1',
      { q: 4, r: 3 },
      'pyramids',
      state,
    );
    expect(result.valid).toBe(true);
  });

  it('rejects pyramids when tile is outside territory even if desert', () => {
    // Territory only the city tile itself; pyramids on a far desert tile fails
    // the territory check BEFORE the wonder check.
    const city = makeCity({ territory: [coordToKey({ q: 3, r: 3 })] });
    let state = createTestState({ cities: new Map([['c1', city]]) });
    state = withTerrain(state, { q: 9, r: 9 }, 'desert');
    const result = validateBuildingPlacement(
      'c1',
      { q: 9, r: 9 },
      'pyramids',
      state,
    );
    expect(result.valid).toBe(false);
    expect(result.reason!.toLowerCase()).toContain('territory');
  });
});

describe('listValidBuildingsForTile', () => {
  it('returns a non-empty subset of registered buildings for a valid empty tile', () => {
    const city = makeCity();
    const state = createTestState({ cities: new Map([['c1', city]]) });
    const ids = listValidBuildingsForTile('c1', { q: 4, r: 3 }, state);
    expect(ids.length).toBeGreaterThan(0);
    // All returned ids must themselves independently validate.
    for (const id of ids) {
      const r = validateBuildingPlacement('c1', { q: 4, r: 3 }, id, state);
      expect(r.valid).toBe(true);
    }
    // The set is a subset of state.config.buildings.
    expect(ids.length).toBeLessThanOrEqual(state.config.buildings.size);
  });

  it('returns [] for a tile already at the 2-building cap', () => {
    const tile = { q: 4, r: 3 };
    const urbanTiles = new Map<string, UrbanTileV2>();
    urbanTiles.set(coordToKey(tile), {
      cityId: 'c1',
      coord: tile,
      buildings: ['granary', 'barracks'],
      specialistCount: 0,
      specialistCapPerTile: 1,
      walled: false,
    });
    const city = makeCity({ urbanTiles });
    const state = createTestState({ cities: new Map([['c1', city]]) });
    const ids = listValidBuildingsForTile('c1', tile, state);
    expect(ids).toEqual([]);
  });

  it('returns [] when the city is unknown', () => {
    const state = createTestState();
    const ids = listValidBuildingsForTile('c-missing', { q: 3, r: 3 }, state);
    expect(ids).toEqual([]);
  });

  it('pyramids appears in the list on desert but not on grassland', () => {
    const city = makeCity();
    let state = createTestState({ cities: new Map([['c1', city]]) });
    const tile = { q: 4, r: 3 };

    const onGrassland = listValidBuildingsForTile('c1', tile, state);
    expect(onGrassland.includes('pyramids')).toBe(false);

    state = withTerrain(state, tile, 'desert');
    const onDesert = listValidBuildingsForTile('c1', tile, state);
    expect(onDesert.includes('pyramids')).toBe(true);
  });
});

describe('listValidTilesForBuilding', () => {
  it('returns tiles inside city territory for a commonly-valid building', () => {
    const city = makeCity();
    const state = createTestState({ cities: new Map([['c1', city]]) });
    const tiles = listValidTilesForBuilding('c1', 'granary', state);
    expect(tiles.length).toBeGreaterThan(0);
    // Every returned tile must be present in the city's territory.
    const territorySet = new Set(city.territory);
    for (const t of tiles) {
      expect(territorySet.has(coordToKey(t))).toBe(true);
    }
    // Every returned tile must itself validate.
    for (const t of tiles) {
      const r = validateBuildingPlacement('c1', t, 'granary', state);
      expect(r.valid).toBe(true);
    }
  });

  it('returns [] when the city is unknown', () => {
    const state = createTestState();
    const tiles = listValidTilesForBuilding('c-missing', 'granary', state);
    expect(tiles).toEqual([]);
  });

  it('returns [] for an unknown buildingId', () => {
    const city = makeCity();
    const state = createTestState({ cities: new Map([['c1', city]]) });
    const tiles = listValidTilesForBuilding('c1', 'not_a_real_building', state);
    expect(tiles).toEqual([]);
  });

  it('shrinks as territory tiles fill to the 2-building cap', () => {
    // Fill one territory tile to cap — the returned list must drop that tile.
    const tile = { q: 4, r: 3 };
    const urbanTiles = new Map<string, UrbanTileV2>();
    urbanTiles.set(coordToKey(tile), {
      cityId: 'c1',
      coord: tile,
      buildings: ['granary', 'barracks'],
      specialistCount: 0,
      specialistCapPerTile: 1,
      walled: false,
    });
    const cityCapped = makeCity({ urbanTiles });
    const stateCapped = createTestState({ cities: new Map([['c1', cityCapped]]) });

    const cityOpen = makeCity();
    const stateOpen = createTestState({ cities: new Map([['c1', cityOpen]]) });

    const openTiles = listValidTilesForBuilding('c1', 'monument', stateOpen);
    const cappedTiles = listValidTilesForBuilding('c1', 'monument', stateCapped);

    expect(cappedTiles.length).toBe(openTiles.length - 1);
    const cappedKeys = new Set(cappedTiles.map(coordToKey));
    expect(cappedKeys.has(coordToKey(tile))).toBe(false);
  });
});
