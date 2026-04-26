/**
 * JJ4 — Natural Wonders on map (map-terrain F-07)
 * Tests for natural wonder yields and adjacency effects in YieldCalculator.
 */
import { describe, it, expect } from 'vitest';
import { calculateCityYields } from '../YieldCalculator';
import { createTestState } from '../../systems/__tests__/helpers';
import { MOUNT_KILIMANJARO, LAKE_VICTORIA, OLD_FAITHFUL } from '../../data/natural-wonders';
import type { CityState, HexTile } from '../../types/GameState';
import type { NaturalWonderDef } from '../../types/NaturalWonder';
import { coordToKey } from '../../hex/HexMath';

function makeCity(overrides: Partial<CityState> = {}): CityState {
  return {
    id: 'c1', name: 'Cairo', owner: 'p1', position: { q: 5, r: 5 },
    population: 1, food: 0, productionQueue: [], productionProgress: 0,
    buildings: [], territory: [coordToKey({ q: 5, r: 5 })],
    settlementType: 'city', happiness: 10, isCapital: true, defenseHP: 100,
    specialization: null, specialists: 0, districts: [],
    ...overrides,
  };
}

describe('JJ4: natural wonder tile yields in calculateCityYields', () => {
  it('a tile with mount_kilimanjaro adds its yields (+2 food, +1 culture) to city total', () => {
    const state = createTestState();

    // Register Kilimanjaro in config (it has yields: { food: 2, culture: 1 })
    const naturalWonders = new Map(state.config.naturalWonders);
    naturalWonders.set(MOUNT_KILIMANJARO.id, MOUNT_KILIMANJARO);
    const config = { ...state.config, naturalWonders };

    const cityTileKey = coordToKey({ q: 5, r: 5 });
    const tiles = new Map(state.map.tiles);
    const existing = tiles.get(cityTileKey)!;
    tiles.set(cityTileKey, {
      ...existing,
      isNaturalWonder: true,
      naturalWonderId: MOUNT_KILIMANJARO.id,
    } as HexTile);

    const stateWithWonder = {
      ...state,
      config,
      map: { ...state.map, tiles },
    };
    const city = makeCity({ territory: [cityTileKey] });

    const baseCity = makeCity({ territory: [cityTileKey] });
    const baseYields = calculateCityYields(baseCity, state);
    const wonderYields = calculateCityYields(city, stateWithWonder);

    // Kilimanjaro: yields = { food: 2, culture: 1 }
    expect(wonderYields.food - baseYields.food).toBe(2);
    expect(wonderYields.culture - baseYields.culture).toBe(1);
  });

  it('a tile with old_faithful adds its yields (+1 production, +1 science)', () => {
    const state = createTestState();

    const naturalWonders = new Map(state.config.naturalWonders);
    naturalWonders.set(OLD_FAITHFUL.id, OLD_FAITHFUL);
    const config = { ...state.config, naturalWonders };

    const cityTileKey = coordToKey({ q: 5, r: 5 });
    const tiles = new Map(state.map.tiles);
    const existing = tiles.get(cityTileKey)!;
    tiles.set(cityTileKey, {
      ...existing,
      isNaturalWonder: true,
      naturalWonderId: OLD_FAITHFUL.id,
    } as HexTile);

    const stateWithWonder = { ...state, config, map: { ...state.map, tiles } };
    const cityWithWonder = makeCity({ territory: [cityTileKey] });
    const cityWithout = makeCity({ territory: [cityTileKey] });

    const baseYields = calculateCityYields(cityWithout, state);
    const wonderYields = calculateCityYields(cityWithWonder, stateWithWonder);

    // Old Faithful: yields = { production: 1, science: 1 }
    expect(wonderYields.production - baseYields.production).toBe(1);
    expect(wonderYields.science - baseYields.science).toBe(1);
  });

  it('a tile without naturalWonderId adds no wonder yield bonus', () => {
    const state = createTestState();
    const cityTileKey = coordToKey({ q: 5, r: 5 });
    const city = makeCity({ territory: [cityTileKey] });

    const yields = calculateCityYields(city, state);
    // Food from base terrain + city center bonus should be present, no wonder bonus
    expect(yields.food).toBeGreaterThan(0); // city center always provides 2 food
  });
});

describe('JJ4: natural wonder adjacencyEffect in calculateCityYields', () => {
  it('lake_victoria adjacency adds +1 food per neighbor in territory', () => {
    const state = createTestState();

    // Build two configs: one with lake_victoria (has adjacencyEffect), one without
    const noAdjWonder: NaturalWonderDef = {
      ...LAKE_VICTORIA,
      adjacencyEffect: undefined,
    };
    const configWith = { ...state.config, naturalWonders: new Map([[LAKE_VICTORIA.id, LAKE_VICTORIA]]) };
    const configWithout = { ...state.config, naturalWonders: new Map([[LAKE_VICTORIA.id, noAdjWonder]]) };

    // Place lake victoria at (5,5); neighbors (6,5) and (5,6)
    const wonderKey = coordToKey({ q: 5, r: 5 });
    const neighbor1Key = coordToKey({ q: 6, r: 5 });
    const neighbor2Key = coordToKey({ q: 5, r: 6 });

    const baseTile: HexTile = {
      coord: { q: 5, r: 5 }, terrain: 'plains', feature: null,
      resource: null, improvement: null, building: null, river: [], elevation: 0.5, continent: 1,
      isNaturalWonder: true, naturalWonderId: LAKE_VICTORIA.id,
    };
    const neighborTile1: HexTile = {
      coord: { q: 6, r: 5 }, terrain: 'plains', feature: null,
      resource: null, improvement: null, building: null, river: [], elevation: 0.5, continent: 1,
    };
    const neighborTile2: HexTile = {
      coord: { q: 5, r: 6 }, terrain: 'plains', feature: null,
      resource: null, improvement: null, building: null, river: [], elevation: 0.5, continent: 1,
    };

    const tiles = new Map(state.map.tiles);
    tiles.set(wonderKey, baseTile);
    tiles.set(neighbor1Key, neighborTile1);
    tiles.set(neighbor2Key, neighborTile2);
    const testMap = { ...state.map, tiles };

    // Same territory, same tiles, only difference is adjacencyEffect in config
    const cityWith2Neighbors = makeCity({ territory: [wonderKey, neighbor1Key, neighbor2Key] });

    const yieldsWithAdj = calculateCityYields(cityWith2Neighbors, { ...state, config: configWith, map: testMap });
    const yieldsWithoutAdj = calculateCityYields(cityWith2Neighbors, { ...state, config: configWithout, map: testMap });

    // Lake Victoria adjacencyEffect = { yield: 'food', value: 1 }
    // 2 neighbors in territory → +2 food from adjacency effect
    expect(yieldsWithAdj.food - yieldsWithoutAdj.food).toBe(2);
  });

  it('a wonder with no adjacencyEffect does not add neighbor bonuses', () => {
    const state = createTestState();

    // OLD_FAITHFUL has no adjacencyEffect
    const naturalWonders = new Map(state.config.naturalWonders);
    naturalWonders.set(OLD_FAITHFUL.id, OLD_FAITHFUL);
    const config = { ...state.config, naturalWonders };

    const wonderKey = coordToKey({ q: 5, r: 5 });
    const neighborKey = coordToKey({ q: 6, r: 5 });

    const tiles = new Map(state.map.tiles);
    const existingTile = tiles.get(wonderKey);
    tiles.set(wonderKey, {
      ...(existingTile ?? {
        coord: { q: 5, r: 5 }, terrain: 'plains', feature: null,
        resource: null, improvement: null, building: null, river: [], elevation: 0.5, continent: 1,
      }),
      isNaturalWonder: true,
      naturalWonderId: OLD_FAITHFUL.id,
    } as HexTile);

    if (!tiles.has(neighborKey)) {
      tiles.set(neighborKey, {
        coord: { q: 6, r: 5 }, terrain: 'plains', feature: null,
        resource: null, improvement: null, building: null, river: [], elevation: 0.5, continent: 1,
      });
    }

    const stateWithWonder = { ...state, config, map: { ...state.map, tiles } };

    const cityWithNeighbor = makeCity({ territory: [wonderKey, neighborKey] });
    const cityAlone = makeCity({ territory: [wonderKey] });

    const yieldsWithNeighbor = calculateCityYields(cityWithNeighbor, stateWithWonder);
    const yieldsAlone = calculateCityYields(cityAlone, stateWithWonder);

    // Old Faithful has no adjacencyEffect — extra neighbor adds only its own terrain yield
    // The production/science difference should equal the neighbor tile's own terrain yield only
    // (no adjacency bonus from the wonder)
    // We test that the difference equals a plain terrain tile (not +1 from wonder)
    const plainsTileYield = calculateCityYields(
      makeCity({ territory: [neighborKey] }),
      stateWithWonder,
    );
    // Yields from both tiles = each tile's own yield + city center bonus once
    // yieldsWithNeighbor = cityCenter + wonderTileYield + neighborTileYield + no adjacency
    // yieldsAlone = cityCenter + wonderTileYield
    // diff = neighborTileYield
    // plainsTileYield = cityCenter + neighborTileYield
    // diff should equal plainsTileYield - cityCenter(2food+1prod)
    const expectedDiff = plainsTileYield.food - 2; // subtract the city center's 2 food
    expect(yieldsWithNeighbor.food - yieldsAlone.food).toBe(expectedDiff);
  });
});

describe('JJ4: NaturalWonderDef shape validation', () => {
  it('mount_kilimanjaro has impassable=true', () => {
    expect(MOUNT_KILIMANJARO.impassable).toBe(true);
  });

  it('mount_kilimanjaro has yields with food and culture', () => {
    expect(MOUNT_KILIMANJARO.yields?.food).toBe(2);
    expect(MOUNT_KILIMANJARO.yields?.culture).toBe(1);
  });

  it('mount_kilimanjaro has adjacencyEffect for food', () => {
    expect(MOUNT_KILIMANJARO.adjacencyEffect?.yield).toBe('food');
    expect(MOUNT_KILIMANJARO.adjacencyEffect?.value).toBe(1);
  });

  it('lake_victoria has food yields and adjacencyEffect', () => {
    expect(LAKE_VICTORIA.yields?.food).toBe(3);
    expect(LAKE_VICTORIA.adjacencyEffect?.yield).toBe('food');
    expect(LAKE_VICTORIA.adjacencyEffect?.value).toBe(1);
  });

  it('old_faithful has production and science yields', () => {
    expect(OLD_FAITHFUL.yields?.production).toBe(1);
    expect(OLD_FAITHFUL.yields?.science).toBe(1);
    expect(OLD_FAITHFUL.adjacencyEffect).toBeUndefined();
  });
});
