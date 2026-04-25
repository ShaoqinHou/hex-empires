import { describe, it, expect } from 'vitest';
import {
  computeAdjacencyBonus,
  totalAdjacencyYieldsForCity,
  quarterBonus,
} from '../DistrictAdjacency';
import { createTestState } from '../../systems/__tests__/helpers';
import { coordToKey } from '../../hex/HexMath';
import type { GameState, HexTile, CityState } from '../../types/GameState';
import type { HexCoord, HexKey } from '../../types/HexCoord';
import type { BuildingId, CityId } from '../../types/Ids';
import type { UrbanTileV2, QuarterV2 } from '../../types/DistrictOverhaul';
import { EMPTY_YIELDS } from '../../types/Yields';

/** Build a minimal HexTile, filling in safe defaults. */
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

/** Build a GameState whose map contains exactly the supplied tiles. */
function stateWithTiles(tiles: ReadonlyArray<HexTile>): GameState {
  const map = new Map<HexKey, HexTile>();
  for (const t of tiles) map.set(coordToKey(t.coord), t);
  return createTestState({
    map: { width: 0, height: 0, tiles: map, wrapX: false },
  });
}

/** Build an UrbanTileV2 with the given buildings. */
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

/** Build a minimal CityState with the given urban tiles and quarters. */
function makeCity(
  id: CityId,
  urban: ReadonlyArray<UrbanTileV2> = [],
  quarters: ReadonlyArray<QuarterV2> = [],
): CityState {
  const urbanMap = new Map<HexKey, UrbanTileV2>();
  for (const u of urban) urbanMap.set(coordToKey(u.coord), u);
  return {
    id,
    name: 'Test City',
    owner: 'p1',
    position: { q: 0, r: 0 },
    population: 1,
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
    quarters,
  };
}

describe('DistrictAdjacency', () => {
  describe('computeAdjacencyBonus', () => {
    it('returns all zeros for a tile with no neighbors in bounds', () => {
      // Only the tile itself exists; its 6 neighbours are outside the map.
      const state = stateWithTiles([makeTile({ coord: { q: 0, r: 0 } })]);
      const city = makeCity('c1');
      const bonus = computeAdjacencyBonus(city, { q: 0, r: 0 }, state);
      expect(bonus).toEqual(EMPTY_YIELDS);
    });

    it('adds +1 Production per adjacent Mountain', () => {
      // Centre at (0,0) with one Mountain neighbour at (1,0).
      const state = stateWithTiles([
        makeTile({ coord: { q: 0, r: 0 } }),
        makeTile({ coord: { q: 1, r: 0 }, feature: 'mountains' }),
      ]);
      const city = makeCity('c1');
      const bonus = computeAdjacencyBonus(city, { q: 0, r: 0 }, state);
      expect(bonus.production).toBe(1);
      expect(bonus.food).toBe(0);
      expect(bonus.science).toBe(0);
    });

    it('stacks multiple mountain neighbours', () => {
      const state = stateWithTiles([
        makeTile({ coord: { q: 0, r: 0 } }),
        makeTile({ coord: { q: 1, r: 0 }, feature: 'mountains' }),
        makeTile({ coord: { q: -1, r: 0 }, feature: 'mountains' }),
        makeTile({ coord: { q: 0, r: 1 }, feature: 'mountains' }),
      ]);
      const city = makeCity('c1');
      const bonus = computeAdjacencyBonus(city, { q: 0, r: 0 }, state);
      expect(bonus.production).toBe(3);
    });

    it('adds +1 Food per adjacent river tile', () => {
      const state = stateWithTiles([
        makeTile({ coord: { q: 0, r: 0 } }),
        makeTile({ coord: { q: 1, r: 0 }, river: [0, 2] }),
      ]);
      const city = makeCity('c1');
      const bonus = computeAdjacencyBonus(city, { q: 0, r: 0 }, state);
      expect(bonus.food).toBe(1);
    });

    it('does not grant food from a tile with an empty river array', () => {
      const state = stateWithTiles([
        makeTile({ coord: { q: 0, r: 0 } }),
        makeTile({ coord: { q: 1, r: 0 }, river: [] }),
      ]);
      const city = makeCity('c1');
      const bonus = computeAdjacencyBonus(city, { q: 0, r: 0 }, state);
      expect(bonus.food).toBe(0);
    });

    it('adds +1 Science when neighbour urban tile hosts a science-category building (library)', () => {
      // `library` is registered with category 'science' in the real config.
      const state = stateWithTiles([
        makeTile({ coord: { q: 0, r: 0 } }),
        makeTile({ coord: { q: 1, r: 0 } }),
      ]);
      const city = makeCity('c1', [
        makeUrban('c1', { q: 1, r: 0 }, ['library']),
      ]);
      const bonus = computeAdjacencyBonus(city, { q: 0, r: 0 }, state);
      expect(bonus.science).toBe(1);
      expect(bonus.culture).toBe(0);
      expect(bonus.gold).toBe(0);
    });

    it('adds +1 Culture when neighbour urban tile hosts a culture-category building (amphitheater)', () => {
      const state = stateWithTiles([
        makeTile({ coord: { q: 0, r: 0 } }),
        makeTile({ coord: { q: 0, r: 1 } }),
      ]);
      const city = makeCity('c1', [
        makeUrban('c1', { q: 0, r: 1 }, ['amphitheatre']),
      ]);
      const bonus = computeAdjacencyBonus(city, { q: 0, r: 0 }, state);
      expect(bonus.culture).toBe(1);
    });

    it('adds +1 Gold when neighbour urban tile hosts a gold-category building (market)', () => {
      const state = stateWithTiles([
        makeTile({ coord: { q: 0, r: 0 } }),
        makeTile({ coord: { q: -1, r: 1 } }),
      ]);
      const city = makeCity('c1', [
        makeUrban('c1', { q: -1, r: 1 }, ['market']),
      ]);
      const bonus = computeAdjacencyBonus(city, { q: 0, r: 0 }, state);
      expect(bonus.gold).toBe(1);
    });

    it('combines mountain + river + urban neighbours in one evaluation', () => {
      const state = stateWithTiles([
        makeTile({ coord: { q: 0, r: 0 } }),
        makeTile({ coord: { q: 1, r: 0 }, feature: 'mountains' }),
        makeTile({ coord: { q: -1, r: 0 }, river: [3] }),
        makeTile({ coord: { q: 0, r: 1 } }),
      ]);
      const city = makeCity('c1', [
        makeUrban('c1', { q: 0, r: 1 }, ['library']),
      ]);
      const bonus = computeAdjacencyBonus(city, { q: 0, r: 0 }, state);
      expect(bonus.production).toBe(1);
      expect(bonus.food).toBe(1);
      expect(bonus.science).toBe(1);
    });

    it('F-02: adds +1 Food +1 Gold when a neighbour tile is ocean (coastal adjacency)', () => {
      // Ocean terrain has isWater: true in the real config.
      const state = stateWithTiles([
        makeTile({ coord: { q: 0, r: 0 } }),
        makeTile({ coord: { q: 1, r: 0 }, terrain: 'ocean' }),
      ]);
      const city = makeCity('c1');
      const bonus = computeAdjacencyBonus(city, { q: 0, r: 0 }, state);
      expect(bonus.food).toBe(1);
      expect(bonus.gold).toBe(1);
      expect(bonus.production).toBe(0);
      expect(bonus.science).toBe(0);
    });

    it('F-02: coastal adjacency returns zero for a non-water neighbour tile (grassland)', () => {
      // Grassland isWater: false — no coastal bonus.
      const state = stateWithTiles([
        makeTile({ coord: { q: 0, r: 0 } }),
        makeTile({ coord: { q: 1, r: 0 }, terrain: 'grassland' }),
      ]);
      const city = makeCity('c1');
      const bonus = computeAdjacencyBonus(city, { q: 0, r: 0 }, state);
      expect(bonus.food).toBe(0);
      expect(bonus.gold).toBe(0);
    });

    it('F-02: adds +1 Production +1 Science when a neighbour tile has a resource', () => {
      // Copper resource tile adjacent to the district.
      const state = stateWithTiles([
        makeTile({ coord: { q: 0, r: 0 } }),
        makeTile({ coord: { q: 1, r: 0 }, resource: 'copper' }),
      ]);
      const city = makeCity('c1');
      const bonus = computeAdjacencyBonus(city, { q: 0, r: 0 }, state);
      expect(bonus.production).toBe(1);
      expect(bonus.science).toBe(1);
      expect(bonus.food).toBe(0);
      expect(bonus.gold).toBe(0);
    });

    it('F-02: adds +2 Culture +1 Science when a neighbour tile is a natural wonder', () => {
      // Tile with naturalWonderId set triggers the natural wonder adjacency rule.
      const state = stateWithTiles([
        makeTile({ coord: { q: 0, r: 0 } }),
        { ...makeTile({ coord: { q: 1, r: 0 } }), naturalWonderId: 'krakatoa', isNaturalWonder: true },
      ]);
      const city = makeCity('c1');
      const bonus = computeAdjacencyBonus(city, { q: 0, r: 0 }, state);
      expect(bonus.culture).toBe(2);
      expect(bonus.science).toBe(1);
      expect(bonus.production).toBe(0);
    });

    it('ignores urban tiles that belong to the same city but have no matching buildings', () => {
      const state = stateWithTiles([
        makeTile({ coord: { q: 0, r: 0 } }),
        makeTile({ coord: { q: 1, r: 0 } }),
      ]);
      // Unknown / non-category building — should produce no bonus.
      const city = makeCity('c1', [
        makeUrban('c1', { q: 1, r: 0 }, ['granary']),
      ]);
      const bonus = computeAdjacencyBonus(city, { q: 0, r: 0 }, state);
      expect(bonus.science).toBe(0);
      expect(bonus.culture).toBe(0);
      expect(bonus.gold).toBe(0);
    });

    it('W3-02: specialist amplifies adjacency by +50% per specialist (SPECIALIST_AMPLIFIER = 0.5)', () => {
      // Tile at (0,0) adjacent to a mountain → base production = 1.
      // With 1 specialist: 1 * (1 + 0.5 * 1) = 1.5
      const state = stateWithTiles([
        makeTile({ coord: { q: 0, r: 0 } }),
        makeTile({ coord: { q: 1, r: 0 }, feature: 'mountains' }),
      ]);
      const urbanWithSpecialist: UrbanTileV2 = {
        ...makeUrban('c1', { q: 0, r: 0 }, []),
        specialistCount: 1,
      };
      const city = makeCity('c1', [urbanWithSpecialist]);
      const bonus = computeAdjacencyBonus(city, { q: 0, r: 0 }, state);
      expect(bonus.production).toBe(1.5); // 1 * (1 + 0.5 * 1)
    });

    it('W3-02: two specialists double-amplify adjacency', () => {
      // Base production = 1 (one mountain neighbor).
      // With 2 specialists: 1 * (1 + 0.5 * 2) = 2.0
      const state = stateWithTiles([
        makeTile({ coord: { q: 0, r: 0 } }),
        makeTile({ coord: { q: 1, r: 0 }, feature: 'mountains' }),
      ]);
      const urbanWithTwoSpec: UrbanTileV2 = {
        ...makeUrban('c1', { q: 0, r: 0 }, []),
        specialistCount: 2,
        specialistCapPerTile: 2,
      };
      const city = makeCity('c1', [urbanWithTwoSpec]);
      const bonus = computeAdjacencyBonus(city, { q: 0, r: 0 }, state);
      expect(bonus.production).toBe(2.0); // 1 * (1 + 0.5 * 2)
    });

    it('W3-02: tile with zero specialists has no amplification (baseline)', () => {
      const state = stateWithTiles([
        makeTile({ coord: { q: 0, r: 0 } }),
        makeTile({ coord: { q: 1, r: 0 }, feature: 'mountains' }),
      ]);
      const city = makeCity('c1', [makeUrban('c1', { q: 0, r: 0 }, [])]);
      const bonus = computeAdjacencyBonus(city, { q: 0, r: 0 }, state);
      expect(bonus.production).toBe(1); // no amplification
    });
  });

  describe('totalAdjacencyYieldsForCity', () => {
    it('returns EMPTY_YIELDS for a city with no urbanTiles field', () => {
      const state = stateWithTiles([makeTile({ coord: { q: 0, r: 0 } })]);
      const city: CityState = {
        ...makeCity('c1'),
        urbanTiles: undefined,
        quarters: undefined,
      };
      expect(totalAdjacencyYieldsForCity(city, state)).toEqual(EMPTY_YIELDS);
    });

    it('returns EMPTY_YIELDS for a city whose urbanTiles map is empty', () => {
      const state = stateWithTiles([makeTile({ coord: { q: 0, r: 0 } })]);
      const city = makeCity('c1', []);
      expect(totalAdjacencyYieldsForCity(city, state)).toEqual(EMPTY_YIELDS);
    });

    it('sums adjacency yields across all populated urban tiles', () => {
      // Two urban tiles, each adjacent to one mountain.
      //   urban A at (0,0) with mountain at (1,0)  -> +1 production
      //   urban B at (0,2) with mountain at (1,2)  -> +1 production
      const state = stateWithTiles([
        makeTile({ coord: { q: 0, r: 0 } }),
        makeTile({ coord: { q: 1, r: 0 }, feature: 'mountains' }),
        makeTile({ coord: { q: 0, r: 2 } }),
        makeTile({ coord: { q: 1, r: 2 }, feature: 'mountains' }),
      ]);
      const city = makeCity('c1', [
        makeUrban('c1', { q: 0, r: 0 }, []),
        makeUrban('c1', { q: 0, r: 2 }, []),
      ]);
      const total = totalAdjacencyYieldsForCity(city, state);
      expect(total.production).toBe(2);
    });
  });

  describe('quarterBonus', () => {
    it('returns EMPTY_YIELDS when the city has no quarters', () => {
      const state = stateWithTiles([makeTile({ coord: { q: 0, r: 0 } })]);
      const city = makeCity('c1');
      expect(quarterBonus(city, state)).toEqual(EMPTY_YIELDS);
    });

    it('returns EMPTY_YIELDS when Quarter has no specialist assigned (W3-02 guard)', () => {
      // F-05 fix: Quarter amplification requires a specialist on the tile.
      const state = stateWithTiles([
        makeTile({ coord: { q: 0, r: 0 } }),
        makeTile({ coord: { q: 1, r: 0 }, feature: 'mountains' }),
      ]);
      const quarter: QuarterV2 = {
        cityId: 'c1',
        coord: { q: 0, r: 0 },
        age: 'antiquity',
        kind: 'pure_age',
        buildingIds: ['library', 'amphitheatre'],
      };
      const city: CityState = {
        ...makeCity('c1', [makeUrban('c1', { q: 0, r: 0 }, ['library', 'amphitheatre'])]),
        quarters: [quarter],
      };
      // specialistCount = 0 (makeUrban default) → bonus should be zero
      expect(quarterBonus(city, state)).toEqual(EMPTY_YIELDS);
    });

    it('amplifies each Quarter tile by +50% of its base adjacency when specialist present (W3-02)', () => {
      // Quarter at (0,0) with TWO adjacent mountains -> base production = 2,
      // so quarter extra should be 2 * 0.5 = 1.
      const state = stateWithTiles([
        makeTile({ coord: { q: 0, r: 0 } }),
        makeTile({ coord: { q: 1, r: 0 }, feature: 'mountains' }),
        makeTile({ coord: { q: -1, r: 0 }, feature: 'mountains' }),
      ]);
      const quarter: QuarterV2 = {
        cityId: 'c1',
        coord: { q: 0, r: 0 },
        age: 'antiquity',
        kind: 'pure_age',
        buildingIds: ['library', 'amphitheatre'],
      };
      const urbanWithSpecialist: UrbanTileV2 = {
        ...makeUrban('c1', { q: 0, r: 0 }, ['library', 'amphitheatre']),
        specialistCount: 1,
      };
      const city: CityState = {
        ...makeCity('c1', [urbanWithSpecialist]),
        quarters: [quarter],
      };
      const extra = quarterBonus(city, state);
      expect(extra.production).toBe(1); // 2 * 0.5
    });

    it('returns half of a single-source adjacency bonus when specialist present', () => {
      // Quarter at (0,0) with ONE mountain neighbour -> base production = 1,
      // so extra should be 0.5.
      const state = stateWithTiles([
        makeTile({ coord: { q: 0, r: 0 } }),
        makeTile({ coord: { q: 1, r: 0 }, feature: 'mountains' }),
      ]);
      const quarter: QuarterV2 = {
        cityId: 'c1',
        coord: { q: 0, r: 0 },
        age: 'antiquity',
        kind: 'pure_age',
        buildingIds: ['library', 'amphitheatre'],
      };
      const urbanWithSpecialist: UrbanTileV2 = {
        ...makeUrban('c1', { q: 0, r: 0 }, ['library', 'amphitheatre']),
        specialistCount: 1,
      };
      const city: CityState = {
        ...makeCity('c1', [urbanWithSpecialist]),
        quarters: [quarter],
      };
      expect(quarterBonus(city, state).production).toBe(0.5);
    });

    it('is purely additive — does NOT include the base adjacency itself', () => {
      // Base bonus at (0,0) is +1 production from the mountain; quarter extra
      // on top is +0.5, so `quarterBonus` should return exactly 0.5, not 1.5.
      const state = stateWithTiles([
        makeTile({ coord: { q: 0, r: 0 } }),
        makeTile({ coord: { q: 1, r: 0 }, feature: 'mountains' }),
      ]);
      const quarter: QuarterV2 = {
        cityId: 'c1',
        coord: { q: 0, r: 0 },
        age: 'antiquity',
        kind: 'pure_age',
        buildingIds: ['library', 'amphitheatre'],
      };
      const urbanWithSpecialist: UrbanTileV2 = {
        ...makeUrban('c1', { q: 0, r: 0 }, ['library', 'amphitheatre']),
        specialistCount: 1,
      };
      const city: CityState = {
        ...makeCity('c1', [urbanWithSpecialist]),
        quarters: [quarter],
      };
      expect(quarterBonus(city, state).production).toBe(0.5);
    });

    it('Z1.4: specialist on tile A gives Quarter bonus to A; tile B without specialist gets no Quarter bonus', () => {
      // Two Quarters in the same city:
      //   - Tile A at (0,0): adjacent to a mountain, HAS a specialist → gets +50% extra
      //   - Tile B at (3,0): adjacent to a mountain, NO specialist → gets zero extra
      //
      // We test each tile in isolation using a city with only one Quarter at a time.
      const state = stateWithTiles([
        makeTile({ coord: { q: 0, r: 0 } }),
        makeTile({ coord: { q: 1, r: 0 }, feature: 'mountains' }),
        makeTile({ coord: { q: 3, r: 0 } }),
        makeTile({ coord: { q: 4, r: 0 }, feature: 'mountains' }),
      ]);

      const quarterA: QuarterV2 = {
        cityId: 'c1', coord: { q: 0, r: 0 }, age: 'antiquity', kind: 'pure_age', buildingIds: [],
      };
      const quarterB: QuarterV2 = {
        cityId: 'c1', coord: { q: 3, r: 0 }, age: 'antiquity', kind: 'pure_age', buildingIds: [],
      };

      // Tile A has a specialist; tile B has none.
      const urbanA: UrbanTileV2 = { ...makeUrban('c1', { q: 0, r: 0 }, []), specialistCount: 1 };
      const urbanB: UrbanTileV2 = { ...makeUrban('c1', { q: 3, r: 0 }, []), specialistCount: 0 };

      // City with only Quarter A (specialist on A) — expects production extra = 0.5
      const cityOnlyA: CityState = { ...makeCity('c1', [urbanA, urbanB]), quarters: [quarterA] };
      const bonusOnlyA = quarterBonus(cityOnlyA, state);
      expect(bonusOnlyA.production).toBe(0.5); // tile A: 1 mountain × 0.5

      // City with only Quarter B (no specialist on B) — expects zero extra
      const cityOnlyB: CityState = { ...makeCity('c1', [urbanA, urbanB]), quarters: [quarterB] };
      const bonusOnlyB = quarterBonus(cityOnlyB, state);
      expect(bonusOnlyB.production).toBe(0); // tile B: no specialist → no Quarter bonus

      // City with BOTH Quarters — A contributes 0.5, B contributes 0, total = 0.5
      const cityBoth: CityState = { ...makeCity('c1', [urbanA, urbanB]), quarters: [quarterA, quarterB] };
      const bonusBoth = quarterBonus(cityBoth, state);
      expect(bonusBoth.production).toBe(0.5); // only tile A fires
    });
  });
});
