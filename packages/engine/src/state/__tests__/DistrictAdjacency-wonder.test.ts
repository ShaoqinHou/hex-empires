/**
 * F-06: Per-wonder adjacency effect tests.
 *
 * Each wonder with adjacencyEffect defined emits its own yield bonus to
 * neighboring tiles that qualify per the `targetCategory` rule:
 *   'urban'  — only when the receiving tile has at least one building
 *   'all'    — always applies in the adjacency evaluation context
 *
 * Wonders without adjacencyEffect fall back to the generic
 * WONDER_ADJACENCY_PER_NEIGHBOR (+2 culture, +1 science).
 */
import { describe, it, expect } from 'vitest';
import { computeAdjacencyBonus } from '../DistrictAdjacency';
import { createTestState } from '../../systems/__tests__/helpers';
import { coordToKey } from '../../hex/HexMath';
import type { GameState, HexTile, CityState } from '../../types/GameState';
import type { HexCoord, HexKey } from '../../types/HexCoord';
import type { BuildingId, CityId } from '../../types/Ids';
import type { UrbanTileV2 } from '../../types/DistrictOverhaul';

/** Build a minimal HexTile with safe defaults. */
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
  };
}

function stateWithTiles(tiles: ReadonlyArray<HexTile>): GameState {
  const map = new Map<HexKey, HexTile>();
  for (const t of tiles) map.set(coordToKey(t.coord), t);
  return createTestState({
    map: { width: 0, height: 0, tiles: map, wrapX: false },
  });
}

function makeUrban(
  cityId: CityId,
  coord: HexCoord,
  buildings: ReadonlyArray<BuildingId>,
): UrbanTileV2 {
  return {
    cityId,
    coord,
    buildings,
    specialistCount: 0,
    specialistCapPerTile: 1,
    walled: false,
  };
}

function makeCity(
  id: CityId,
  urban: ReadonlyArray<UrbanTileV2> = [],
): CityState {
  const urbanMap = new Map<HexKey, UrbanTileV2>();
  for (const u of urban) urbanMap.set(coordToKey(u.coord), u);
  return {
    id,
    name: 'Test City',
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
    urbanTiles: urbanMap,
    quarters: [],
  };
}

describe('F-06: per-wonder adjacency effects', () => {
  it('Pyramids (targetCategory=urban) grants +2 faith to an adjacent urban tile with buildings', () => {
    // Tile A at (0,0) is urban with a market building (the tile being evaluated).
    // Neighbor B at (1,0) holds Pyramids.
    const state = stateWithTiles([
      makeTile({ coord: { q: 0, r: 0 } }),
      makeTile({ coord: { q: 1, r: 0 } }),
    ]);
    const city = makeCity('c1', [
      makeUrban('c1', { q: 0, r: 0 }, ['market']),    // evaluated tile — has building (gold-category)
      makeUrban('c1', { q: 1, r: 0 }, ['pyramids']),  // neighbor has the wonder
    ]);
    const bonus = computeAdjacencyBonus(city, { q: 0, r: 0 }, state);
    // Pyramids.adjacencyEffect = { yield: 'faith', value: 2, targetCategory: 'urban' }
    // evaluated tile has buildings → targetCategory='urban' qualifies
    expect(bonus.faith).toBe(2);
    // Pyramids has its own adjacencyEffect → generic WONDER_ADJACENCY_PER_NEIGHBOR NOT used
    expect(bonus.culture).toBe(0);
    // (1,0) has pyramids only — pyramids is category 'wonder' not 'science', so no campus bonus
    expect(bonus.science).toBe(0);
  });

  it('Pyramids (targetCategory=urban) grants NO faith to an adjacent urban tile with NO buildings', () => {
    // Tile A at (0,0) is an empty urban tile (no buildings).
    // Neighbor B at (1,0) holds Pyramids.
    const state = stateWithTiles([
      makeTile({ coord: { q: 0, r: 0 } }),
      makeTile({ coord: { q: 1, r: 0 } }),
    ]);
    const city = makeCity('c1', [
      makeUrban('c1', { q: 0, r: 0 }, []),            // evaluated tile — no buildings
      makeUrban('c1', { q: 1, r: 0 }, ['pyramids']),  // neighbor has the wonder
    ]);
    const bonus = computeAdjacencyBonus(city, { q: 0, r: 0 }, state);
    // targetCategory='urban' requires the evaluated tile to have buildings — none here → no faith bonus
    expect(bonus.faith).toBe(0);
    // Also no generic culture/science (Pyramids has adjacencyEffect, so generic constant NOT used)
    expect(bonus.culture).toBe(0);
    expect(bonus.science).toBe(0);
  });

  it('Hanging Gardens (targetCategory=all) grants +1 food to any adjacent tile including one with no buildings', () => {
    // Tile A at (0,0) is an urban tile with NO buildings.
    // Neighbor B at (1,0) holds Hanging Gardens.
    const state = stateWithTiles([
      makeTile({ coord: { q: 0, r: 0 } }),
      makeTile({ coord: { q: 1, r: 0 } }),
    ]);
    const city = makeCity('c1', [
      makeUrban('c1', { q: 0, r: 0 }, []),                      // empty urban tile
      makeUrban('c1', { q: 1, r: 0 }, ['hanging_gardens']),     // neighbor has the wonder
    ]);
    const bonus = computeAdjacencyBonus(city, { q: 0, r: 0 }, state);
    // Hanging Gardens.adjacencyEffect = { yield: 'food', value: 1, targetCategory: 'all' }
    expect(bonus.food).toBe(1);
    expect(bonus.culture).toBe(0); // NOT generic wonder fallback
    expect(bonus.science).toBe(0);
  });

  it('Stonehenge (targetCategory=all) grants +1 faith to any adjacent tile', () => {
    const state = stateWithTiles([
      makeTile({ coord: { q: 0, r: 0 } }),
      makeTile({ coord: { q: 0, r: 1 } }),
    ]);
    const city = makeCity('c1', [
      makeUrban('c1', { q: 0, r: 0 }, []),                 // evaluated — no buildings
      makeUrban('c1', { q: 0, r: 1 }, ['stonehenge']),     // neighbor wonder
    ]);
    const bonus = computeAdjacencyBonus(city, { q: 0, r: 0 }, state);
    expect(bonus.faith).toBe(1);
    expect(bonus.culture).toBe(0);
  });

  it('two wonders with adjacencyEffect on different neighbor tiles both apply', () => {
    // Evaluated tile at (0,0) with market (has buildings → qualifies for 'urban' target).
    // Neighbor at (1,0) has Pyramids → +2 faith (targetCategory='urban', evaluated tile has market)
    // Neighbor at (-1,0) has Hanging Gardens → +1 food (targetCategory='all')
    const state = stateWithTiles([
      makeTile({ coord: { q: 0, r: 0 } }),
      makeTile({ coord: { q: 1, r: 0 } }),
      makeTile({ coord: { q: -1, r: 0 } }),
    ]);
    const city = makeCity('c1', [
      makeUrban('c1', { q: 0, r: 0 }, ['market']),
      makeUrban('c1', { q: 1, r: 0 }, ['pyramids']),
      makeUrban('c1', { q: -1, r: 0 }, ['hanging_gardens']),
    ]);
    const bonus = computeAdjacencyBonus(city, { q: 0, r: 0 }, state);
    // Pyramids → +2 faith; Hanging Gardens → +1 food
    expect(bonus.faith).toBe(2);
    expect(bonus.food).toBe(1);
    // No generic wonder fallback (both wonders have their own adjacencyEffect)
    expect(bonus.culture).toBe(0);
    // neighbors (1,0)=pyramids and (-1,0)=hanging_gardens are both category 'wonder', not 'gold'
    // market at (0,0) does not affect ITS OWN adjacency bonus (only neighbors' buildings matter)
    expect(bonus.gold).toBe(0);
    // (+1 gold from market adjacency would only apply if another tile had (0,0) as its neighbor with a commercial building)
    // (1,0) has pyramids (wonder, not science) → no campus bonus
    expect(bonus.science).toBe(0);
  });

  it('Great Library (targetCategory=urban) grants +2 science to adjacent tile with buildings', () => {
    const state = stateWithTiles([
      makeTile({ coord: { q: 0, r: 0 } }),
      makeTile({ coord: { q: 1, r: 0 } }),
    ]);
    const city = makeCity('c1', [
      makeUrban('c1', { q: 0, r: 0 }, ['market']),          // evaluated tile has market (buildings.length > 0)
      makeUrban('c1', { q: 1, r: 0 }, ['great_library']),   // neighbor has Great Library
    ]);
    const bonus = computeAdjacencyBonus(city, { q: 0, r: 0 }, state);
    // Great Library.adjacencyEffect = { yield: 'science', value: 2, targetCategory: 'urban' }
    // Evaluated tile has market (buildings.length > 0) → qualifies for 'urban'
    expect(bonus.science).toBe(2);
    // great_library has category='wonder' not 'gold' → no commercial adjacency
    expect(bonus.gold).toBe(0);
    // great_library has adjacencyEffect → generic wonder fallback NOT used
    expect(bonus.culture).toBe(0);
  });

  it('a wonder without adjacencyEffect (generic) still gives +2 culture +1 science fallback', () => {
    // Colossus has no adjacencyEffect — falls back to generic WONDER_ADJACENCY_PER_NEIGHBOR.
    const state = stateWithTiles([
      makeTile({ coord: { q: 0, r: 0 } }),
      makeTile({ coord: { q: 1, r: 0 } }),
    ]);
    const city = makeCity('c1', [
      makeUrban('c1', { q: 0, r: 0 }, []),
      makeUrban('c1', { q: 1, r: 0 }, ['colossus']),
    ]);
    const bonus = computeAdjacencyBonus(city, { q: 0, r: 0 }, state);
    // Generic fallback: +2 culture, +1 science
    expect(bonus.culture).toBe(2);
    expect(bonus.science).toBe(1);
    expect(bonus.faith).toBe(0);
  });
});
