/**
 * KK3.2 — population-specialists F-03: Specialist adjacency amplification with cap.
 *
 * Each specialist on an urban tile amplifies that tile's adjacency yields by
 * +50% per specialist (SPECIALIST_AMPLIFIER = 0.5), capped at 2 specialists
 * (max multiplier = 1 + 0.5 × 2 = 2.0).
 *
 * Distribution rule: specialists are tracked at city level (not per-tile for
 * cities without per-tile spatial data). For cities WITH urbanTile spatial
 * data (urbanTiles map), the per-tile specialistCount is used directly.
 *
 * Cap behavior: a tile with 3 or more specialists is treated as if it has 2,
 * yielding the same 2.0× multiplier as 2 specialists.
 */
import { describe, it, expect } from 'vitest';
import { computeAdjacencyBonus } from '../DistrictAdjacency';
import { createTestState } from '../../systems/__tests__/helpers';
import type { GameState, HexTile, CityState } from '../../types/GameState';
import type { HexCoord, HexKey } from '../../types/HexCoord';
import type { UrbanTileV2 } from '../../types/DistrictOverhaul';
import { coordToKey } from '../../hex/HexMath';

function makeTile(partial: Partial<HexTile> & { coord: HexCoord }): HexTile {
  return {
    coord: partial.coord,
    terrain: partial.terrain ?? 'grassland',
    feature: partial.feature ?? null,
    resource: partial.resource ?? null,
    improvement: partial.improvement ?? null,
    building: partial.building ?? null,
    river: partial.river ?? [],
    elevation: partial.elevation ?? 0.5,
    continent: partial.continent ?? 1,
    ...partial,
  };
}

function stateWithTiles(tiles: ReadonlyArray<HexTile>): GameState {
  const map = new Map<HexKey, HexTile>();
  for (const t of tiles) map.set(coordToKey(t.coord), t);
  return createTestState({
    map: { width: 0, height: 0, tiles: map, wrapX: false },
  });
}

function makeCityWithUrbanTile(specialistCount: number, specialistCapPerTile = 4): CityState {
  const coord: HexCoord = { q: 0, r: 0 };
  const tileKey = coordToKey(coord) as HexKey;
  const urbanTile: UrbanTileV2 = {
    cityId: 'c1',
    coord,
    buildings: [],
    specialistCount,
    specialistCapPerTile,
    walled: false,
  };
  const urbanTiles = new Map<HexKey, UrbanTileV2>([[tileKey, urbanTile]]);
  return {
    id: 'c1',
    name: 'Test City',
    owner: 'p1',
    position: coord,
    population: 5,
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
    specialists: specialistCount,
    districts: [],
    urbanTiles,
  };
}

describe('KK3.2 — specialist adjacency amplification with cap (population-specialists F-03)', () => {
  // Base scenario: tile at (0,0) adjacent to a mountain at (1,0).
  // Base production adjacency = 1 (one mountain neighbor).

  it('city with 0 specialists: adjacency yields unchanged (no amplification)', () => {
    const state = stateWithTiles([
      makeTile({ coord: { q: 0, r: 0 } }),
      makeTile({ coord: { q: 1, r: 0 }, feature: 'mountains' }),
    ]);
    const city = makeCityWithUrbanTile(0);
    const bonus = computeAdjacencyBonus(city, { q: 0, r: 0 }, state);
    // Base: 1 mountain neighbor → production = 1, no amplification
    expect(bonus.production).toBe(1);
    expect(bonus.food).toBe(0);
    expect(bonus.science).toBe(0);
  });

  it('city with 1 specialist: adjacency yields amplified by 1.5× (1 + 0.5×1)', () => {
    const state = stateWithTiles([
      makeTile({ coord: { q: 0, r: 0 } }),
      makeTile({ coord: { q: 1, r: 0 }, feature: 'mountains' }),
    ]);
    const city = makeCityWithUrbanTile(1);
    const bonus = computeAdjacencyBonus(city, { q: 0, r: 0 }, state);
    // 1 specialist: 1 × (1 + 0.5 × 1) = 1.5
    expect(bonus.production).toBe(1.5);
  });

  it('city with 2 specialists: adjacency yields amplified by 2.0× (1 + 0.5×2 = 2.0)', () => {
    const state = stateWithTiles([
      makeTile({ coord: { q: 0, r: 0 } }),
      makeTile({ coord: { q: 1, r: 0 }, feature: 'mountains' }),
    ]);
    const city = makeCityWithUrbanTile(2);
    const bonus = computeAdjacencyBonus(city, { q: 0, r: 0 }, state);
    // 2 specialists: 1 × (1 + 0.5 × 2) = 2.0 (maximum multiplier)
    expect(bonus.production).toBe(2.0);
  });

  it('city with 4 specialists across 2 urban tiles: each tile amplified by (1 + 0.5×2) = 2×', () => {
    // Two urban tiles at (0,0) and (0,2), each with 2 specialists (4 total).
    // Each tile gets capped at 2 specialists → multiplier 2.0.
    // Base adjacency for (0,0) = mountain at (1,0) → production: 1 → amplified: 2.0
    // Base adjacency for (0,2) = mountain at (1,2) → production: 1 → amplified: 2.0

    const state = stateWithTiles([
      makeTile({ coord: { q: 0, r: 0 } }),
      makeTile({ coord: { q: 1, r: 0 }, feature: 'mountains' }),
      makeTile({ coord: { q: 0, r: 2 } }),
      makeTile({ coord: { q: 1, r: 2 }, feature: 'mountains' }),
    ]);

    // City with two urban tiles, each with 2 specialists
    const tileA: HexCoord = { q: 0, r: 0 };
    const tileB: HexCoord = { q: 0, r: 2 };
    const urbanA: UrbanTileV2 = {
      cityId: 'c1',
      coord: tileA,
      buildings: [],
      specialistCount: 2,
      specialistCapPerTile: 2,
      walled: false,
    };
    const urbanB: UrbanTileV2 = {
      cityId: 'c1',
      coord: tileB,
      buildings: [],
      specialistCount: 2,
      specialistCapPerTile: 2,
      walled: false,
    };
    const urbanTiles = new Map<HexKey, UrbanTileV2>([
      [coordToKey(tileA) as HexKey, urbanA],
      [coordToKey(tileB) as HexKey, urbanB],
    ]);
    const city: CityState = {
      id: 'c1',
      name: 'Test City',
      owner: 'p1',
      position: tileA,
      population: 6,
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
      specialists: 4,
      districts: [],
      urbanTiles,
    };

    // Tile A adjacency
    const bonusA = computeAdjacencyBonus(city, tileA, state);
    expect(bonusA.production).toBe(2.0); // 1 × 2.0 cap

    // Tile B adjacency
    const bonusB = computeAdjacencyBonus(city, tileB, state);
    expect(bonusB.production).toBe(2.0); // 1 × 2.0 cap
  });

  it('cap at 2 specialists: 3 specialists on one tile = same result as 2 specialists', () => {
    const state = stateWithTiles([
      makeTile({ coord: { q: 0, r: 0 } }),
      makeTile({ coord: { q: 1, r: 0 }, feature: 'mountains' }),
    ]);
    const cityWith2 = makeCityWithUrbanTile(2);
    const cityWith3 = makeCityWithUrbanTile(3);

    const bonus2 = computeAdjacencyBonus(cityWith2, { q: 0, r: 0 }, state);
    const bonus3 = computeAdjacencyBonus(cityWith3, { q: 0, r: 0 }, state);

    // Both should be capped at 2.0× → same production result
    expect(bonus2.production).toBe(2.0);
    expect(bonus3.production).toBe(2.0);
  });

  it('amplification applies to all yield types (food from river + production from mountain)', () => {
    // Tile at (0,0) adjacent to a river tile (1,0) and a mountain (−1,0).
    // Base food = 1 (river), base production = 1 (mountain).
    // With 2 specialists: both amplified to 2.0.
    const state = stateWithTiles([
      makeTile({ coord: { q: 0, r: 0 } }),
      makeTile({ coord: { q: 1, r: 0 }, river: [0, 2] }),
      makeTile({ coord: { q: -1, r: 0 }, feature: 'mountains' }),
    ]);
    const city = makeCityWithUrbanTile(2);
    const bonus = computeAdjacencyBonus(city, { q: 0, r: 0 }, state);
    expect(bonus.food).toBe(2.0);       // 1 × 2.0
    expect(bonus.production).toBe(2.0); // 1 × 2.0
    expect(bonus.science).toBe(0);      // no science neighbor
  });
});
