import { describe, it, expect } from 'vitest';
import { calculateCityYieldsWithAdjacency } from '../CityYieldsWithAdjacency';
import { calculateCityYields } from '../YieldCalculator';
import { createTestState, createTestUnit } from '../../systems/__tests__/helpers';
import { coordToKey } from '../../hex/HexMath';
import type { GameState, HexTile, CityState } from '../../types/GameState';
import type { CommanderState } from '../../types/Commander';
import type { HexKey, HexCoord } from '../../types/HexCoord';
import type { BuildingId, CityId } from '../../types/Ids';
import type { UrbanTileV2, QuarterV2 } from '../../types/DistrictOverhaul';
import type { YieldSet } from '../../types/Yields';

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

/**
 * Build a minimal CityState. By default `urbanTiles` is present but empty
 * and `quarters` is an empty array — this mimics a post-M9 Cycle B city
 * with no districts built yet. Pass `urbanTiles: undefined` via
 * `patchCity` to simulate pre-M9 cities.
 */
function makeCity(
  id: CityId,
  territory: ReadonlyArray<HexKey> = [],
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
    territory,
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

function makeCommanderState(overrides: Partial<CommanderState> = {}): CommanderState {
  return {
    unitId: 'cmd1',
    xp: 0,
    commanderLevel: 1,
    unspentPromotionPicks: 0,
    promotions: [],
    tree: null,
    attachedUnits: [],
    packed: false,
    ...overrides,
  };
}

const YIELD_KEYS: ReadonlyArray<keyof YieldSet> = [
  'food',
  'production',
  'gold',
  'science',
  'culture',
  'faith',
  'influence',
  'happiness',
] as const;

describe('calculateCityYieldsWithAdjacency', () => {
  it('returns the same values as calculateCityYields when city has no urbanTiles (pre-M9)', () => {
    const state = stateWithTiles([makeTile({ coord: { q: 0, r: 0 } })]);
    // Simulate a pre-M9 city: urbanTiles and quarters both undefined.
    const city: CityState = {
      ...makeCity('c1'),
      urbanTiles: undefined,
      quarters: undefined,
    };
    const base = calculateCityYields(city, state);
    const stacked = calculateCityYieldsWithAdjacency(city, state);
    expect(stacked).toEqual(base);
  });

  it('returns the same values as calculateCityYields when city has empty urbanTiles map and no quarters', () => {
    const state = stateWithTiles([makeTile({ coord: { q: 0, r: 0 } })]);
    const city = makeCity('c1');
    const base = calculateCityYields(city, state);
    const stacked = calculateCityYieldsWithAdjacency(city, state);
    expect(stacked).toEqual(base);
  });

  it('adds +1 production for one Mountain-adjacent urban tile', () => {
    const state = stateWithTiles([
      makeTile({ coord: { q: 0, r: 0 } }),
      makeTile({ coord: { q: 1, r: 0 }, feature: 'mountains' }),
    ]);
    const city = makeCity('c1', [], [makeUrban('c1', { q: 0, r: 0 }, [])]);
    const base = calculateCityYields(city, state);
    const stacked = calculateCityYieldsWithAdjacency(city, state);
    expect(stacked.production).toBe(base.production + 1);
    // Other fields should be unchanged by this single mountain neighbour.
    expect(stacked.food).toBe(base.food);
    expect(stacked.science).toBe(base.science);
  });

  it('includes both base adjacency and quarter amplification for a Quarter tile WITH specialist (W3-02)', () => {
    // Quarter at (0,0) with TWO mountain neighbours:
    //   base adjacency  = +2 production (from totalAdjacencyYieldsForCity)
    //   specialist multiplier on tile: 1 + 0.5*1 = 1.5 → adjacency = 2 * 1.5 = 3
    //   quarter extra on BASE (no specialist factor): 2 * 0.5 = +1 production
    //   total delta     = +3 (specialist-amplified adjacency) + 1 (quarter) = +4 production.
    // Wait — the specialist amplification is already in computeAdjacencyBonus, which
    // is called by totalAdjacencyYieldsForCity. quarterBonus uses computeBaseAdjacencyWithoutSpecialist,
    // so quarter extra = 2 * 0.5 = 1.
    // Total stacked = base + (2 * 1.5) + 1 = base + 4.
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
      ...makeCity(
        'c1',
        [],
        [urbanWithSpecialist],
      ),
      quarters: [quarter],
    };
    const base = calculateCityYields(city, state);
    const stacked = calculateCityYieldsWithAdjacency(city, state);
    // adjacency with specialist = 2 * 1.5 = 3; quarter extra = 2 * 0.5 = 1 → total +4
    expect(stacked.production).toBe(base.production + 4);
  });

  it('Quarter tile WITHOUT specialist gives no quarter bonus (W3-02 guard)', () => {
    // Same setup but specialistCount = 0 → quarter extra = 0.
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
    const city: CityState = {
      ...makeCity(
        'c1',
        [],
        [makeUrban('c1', { q: 0, r: 0 }, ['library', 'amphitheatre'])],
      ),
      quarters: [quarter],
    };
    const base = calculateCityYields(city, state);
    const stacked = calculateCityYieldsWithAdjacency(city, state);
    // adjacency = 2 (no specialist multiplier); quarter = 0 (no specialist)
    expect(stacked.production).toBe(base.production + 2);
  });

  it('result is >= base yields in every yield field (adjacency is additive-only)', () => {
    // Set up a rich-ish scenario: mountain + river + urban-science neighbour.
    const state = stateWithTiles([
      makeTile({ coord: { q: 0, r: 0 } }),
      makeTile({ coord: { q: 1, r: 0 }, feature: 'mountains' }),
      makeTile({ coord: { q: -1, r: 0 }, river: [0, 1] }),
      makeTile({ coord: { q: 0, r: 1 } }),
    ]);
    const city = makeCity(
      'c1',
      [],
      [
        makeUrban('c1', { q: 0, r: 0 }, []),
        makeUrban('c1', { q: 0, r: 1 }, ['library']),
      ],
    );
    const base = calculateCityYields(city, state);
    const stacked = calculateCityYieldsWithAdjacency(city, state);
    for (const key of YIELD_KEYS) {
      expect(stacked[key]).toBeGreaterThanOrEqual(base[key]);
    }
  });

  it('pure function: same inputs produce same outputs across repeated calls', () => {
    const state = stateWithTiles([
      makeTile({ coord: { q: 0, r: 0 } }),
      makeTile({ coord: { q: 1, r: 0 }, feature: 'mountains' }),
    ]);
    const city = makeCity('c1', [], [makeUrban('c1', { q: 0, r: 0 }, [])]);
    const first = calculateCityYieldsWithAdjacency(city, state);
    const second = calculateCityYieldsWithAdjacency(city, state);
    const third = calculateCityYieldsWithAdjacency(city, state);
    expect(second).toEqual(first);
    expect(third).toEqual(first);
  });

  it('does not mutate the CityState passed in', () => {
    const state = stateWithTiles([
      makeTile({ coord: { q: 0, r: 0 } }),
      makeTile({ coord: { q: 1, r: 0 }, feature: 'mountains' }),
    ]);
    const urbanTile = makeUrban('c1', { q: 0, r: 0 }, ['library']);
    const quarter: QuarterV2 = {
      cityId: 'c1',
      coord: { q: 0, r: 0 },
      age: 'antiquity',
      kind: 'pure_age',
      buildingIds: ['library', 'amphitheatre'],
    };
    const city: CityState = {
      ...makeCity('c1', [], [urbanTile]),
      quarters: [quarter],
    };
    // Snapshot the shape BEFORE invocation.
    const urbanSizeBefore = city.urbanTiles!.size;
    const urbanBuildingsBefore = [...urbanTile.buildings];
    const quartersLengthBefore = city.quarters!.length;
    const populationBefore = city.population;

    calculateCityYieldsWithAdjacency(city, state);

    expect(city.urbanTiles!.size).toBe(urbanSizeBefore);
    expect(urbanTile.buildings).toEqual(urbanBuildingsBefore);
    expect(city.quarters!.length).toBe(quartersLengthBefore);
    expect(city.population).toBe(populationBefore);
  });

  it('does not mutate the GameState passed in', () => {
    const state = stateWithTiles([
      makeTile({ coord: { q: 0, r: 0 } }),
      makeTile({ coord: { q: 1, r: 0 }, feature: 'mountains' }),
    ]);
    const city = makeCity('c1', [], [makeUrban('c1', { q: 0, r: 0 }, [])]);
    const turnBefore = state.turn;
    const mapSizeBefore = state.map.tiles.size;

    calculateCityYieldsWithAdjacency(city, state);

    expect(state.turn).toBe(turnBefore);
    expect(state.map.tiles.size).toBe(mapSizeBefore);
  });

  it('stacks across multiple urban tiles each with their own adjacency', () => {
    // Two separated urban tiles, each adjacent to one mountain:
    //   urban A at (0,0) with mountain at (1,0)   -> +1 production
    //   urban B at (0,3) with mountain at (1,3)   -> +1 production
    // total stacked.production = base.production + 2.
    const state = stateWithTiles([
      makeTile({ coord: { q: 0, r: 0 } }),
      makeTile({ coord: { q: 1, r: 0 }, feature: 'mountains' }),
      makeTile({ coord: { q: 0, r: 3 } }),
      makeTile({ coord: { q: 1, r: 3 }, feature: 'mountains' }),
    ]);
    const city = makeCity(
      'c1',
      [],
      [
        makeUrban('c1', { q: 0, r: 0 }, []),
        makeUrban('c1', { q: 0, r: 3 }, []),
      ],
    );
    const base = calculateCityYields(city, state);
    const stacked = calculateCityYieldsWithAdjacency(city, state);
    expect(stacked.production).toBe(base.production + 2);
  });

  it('combines terrain adjacency with urban-neighbour adjacency (mountain + library)', () => {
    // Urban tile at (0,0): neighbour (1,0) mountain (-1,0) library.
    // Urban tile at (-1,0): (0,0) isnt science. Keep urban isolated.
    // To avoid cross-contribution from the second urban tile's own
    // neighbours, place its mountain-less library off on the opposite row.
    //   urban A at (0,0):
    //     neighbour (1,0) mountain             -> +1 production for A
    //     neighbour (0,-1) urban with library  -> +1 science for A
    //   urban B at (0,-1) (holds the library):
    //     its neighbours: (1,-1), (1,-2), (0,-2), (-1,-1), (-1,0), (0,0)
    //     none of those are mountains, so B contributes no terrain bonus.
    const state = stateWithTiles([
      makeTile({ coord: { q: 0, r: 0 } }),
      makeTile({ coord: { q: 1, r: 0 }, feature: 'mountains' }),
      makeTile({ coord: { q: 0, r: -1 } }),
    ]);
    const city = makeCity(
      'c1',
      [],
      [
        makeUrban('c1', { q: 0, r: 0 }, []),
        makeUrban('c1', { q: 0, r: -1 }, ['library']),
      ],
    );
    const base = calculateCityYields(city, state);
    const stacked = calculateCityYieldsWithAdjacency(city, state);
    expect(stacked.production).toBe(base.production + 1);
    expect(stacked.science).toBe(base.science + 1);
  });

  it('returns a plain YieldSet (all 9 numeric fields present and finite)', () => {
    const state = stateWithTiles([makeTile({ coord: { q: 0, r: 0 } })]);
    const city = makeCity('c1');
    const result = calculateCityYieldsWithAdjacency(city, state);
    for (const key of YIELD_KEYS) {
      expect(typeof result[key]).toBe('number');
      expect(Number.isFinite(result[key])).toBe(true);
    }
  });

  it('applies +5% Leadership Zeal to all nonzero city yields when one commander is stationed in city center', () => {
    const state = stateWithTiles([
      makeTile({ coord: { q: 0, r: 0 } }),
      makeTile({ coord: { q: 1, r: 0 }, feature: 'mountains' }),
    ]);
    const city = {
      ...makeCity('c1'),
      buildings: ['monument', 'market', 'shrine', 'library'],
    };
    const base = calculateCityYields(city, state);

    const withZeal = calculateCityYieldsWithAdjacency(city, {
      ...state,
      cities: new Map([['c1', city]]),
      units: new Map([['cmd1', createTestUnit({
        id: 'cmd1',
        typeId: 'army_commander',
        owner: city.owner,
        position: city.position,
        promotions: ['leadership_zeal'],
      })]]),
      commanders: new Map([['cmd1', makeCommanderState()]]),
    });

    for (const key of YIELD_KEYS) {
      if (base[key] > 0) {
        expect(withZeal[key]).toBe(Math.floor(base[key] * 105 / 100));
      }
    }
  });

  it('stacks Leadership Zeal additively across commanders', () => {
    const state = stateWithTiles([makeTile({ coord: { q: 0, r: 0 } })]);
    const city = {
      ...makeCity('c1'),
      buildings: ['library', 'market', 'shrine'],
    };
    const base = calculateCityYields(city, state);

    const withDoubleZeal = calculateCityYieldsWithAdjacency(city, {
      ...state,
      cities: new Map([['c1', city]]),
      units: new Map([
        ['cmd1', createTestUnit({
          id: 'cmd1',
          typeId: 'army_commander',
          owner: city.owner,
          position: city.position,
          promotions: ['leadership_zeal'],
        })],
        ['cmd2', createTestUnit({
          id: 'cmd2',
          typeId: 'army_commander',
          owner: city.owner,
          position: city.position,
        })],
      ]),
      commanders: new Map([
        ['cmd1', makeCommanderState()],
        ['cmd2', makeCommanderState({ promotions: ['leadership_zeal'] })],
      ]),
    });

    for (const key of YIELD_KEYS) {
      if (base[key] > 0) {
        expect(withDoubleZeal[key]).toBe(Math.floor(base[key] * 110 / 100));
      }
    }
  });

  it('does not apply Leadership Zeal for enemy commanders or commanders elsewhere', () => {
    const baseState = stateWithTiles([
      makeTile({ coord: { q: 0, r: 0 } }),
      makeTile({ coord: { q: 5, r: 5 } }),
    ]);
    const city = {
      ...makeCity('c1'),
      buildings: ['library', 'market', 'shrine'],
      position: { q: 0, r: 0 },
    };
    const otherCity = {
      ...makeCity('c2', [coordToKey({ q: 5, r: 5 })]),
      position: { q: 5, r: 5 },
      isCapital: false,
      name: 'Other',
      owner: 'p1',
      buildings: ['market'],
    };
    const base = calculateCityYields(city, baseState);

    const enemyCommander = calculateCityYieldsWithAdjacency(city, {
      ...baseState,
      cities: new Map([['c1', city]]),
      units: new Map([['cmd1', createTestUnit({
        id: 'cmd1',
        typeId: 'army_commander',
        owner: 'p2',
        position: city.position,
        promotions: ['leadership_zeal'],
      })]]),
      commanders: new Map([['cmd1', makeCommanderState({
        unitId: 'cmd1',
        promotions: ['leadership_zeal'],
      })]]),
      players: new Map([
        ['p1', baseState.players.get('p1')!],
        ['p2', { ...baseState.players.get('p1')!, id: 'p2', civilizationId: 'egypt' }],
      ]),
    });
    expect(enemyCommander).toEqual(base);

    const otherCityCommander = calculateCityYieldsWithAdjacency(city, {
      ...baseState,
      cities: new Map([
        ['c1', city],
        ['c2', otherCity],
      ]),
      units: new Map([['cmd2', createTestUnit({
        id: 'cmd2',
        typeId: 'army_commander',
        owner: 'p1',
        position: { q: 5, r: 5 },
      })]]),
      commanders: new Map([['cmd2', makeCommanderState({
        unitId: 'cmd2',
        promotions: ['leadership_zeal'],
      })]]),
    });
    expect(otherCityCommander).toEqual(base);
  });

  it('counts a commander stationed on a V2 urban tile for Leadership Zeal', () => {
    const urbanCoord = { q: 1, r: 0 };
    const urbanTile = makeUrban('c1', urbanCoord, ['shrine']);
    const state = stateWithTiles([
      makeTile({ coord: { q: 0, r: 0 } }),
      makeTile({ coord: urbanCoord }),
    ]);
    const city = {
      ...makeCity('c1', [], [urbanTile]),
      buildings: ['library', 'market', 'shrine'],
      urbanTiles: new Map([[coordToKey(urbanCoord), urbanTile]]),
    };
    const base = calculateCityYields(city, state);

    const onUrbanTile = calculateCityYieldsWithAdjacency(city, {
      ...state,
      cities: new Map([['c1', city]]),
      units: new Map([['cmd1', createTestUnit({
        id: 'cmd1',
        typeId: 'army_commander',
        owner: 'p1',
        position: urbanCoord,
        promotions: ['leadership_zeal'],
      })]]),
      commanders: new Map([['cmd1', makeCommanderState({
        unitId: 'cmd1',
        promotions: ['logistics_recruitment'],
      })]]),
    });

    for (const key of YIELD_KEYS) {
      if (base[key] > 0) {
        expect(onUrbanTile[key]).toBe(Math.floor(base[key] * 105 / 100));
      }
    }
  });

  it('does not make negative net yields worse with Leadership Zeal', () => {
    const state = stateWithTiles([makeTile({ coord: { q: 0, r: 0 }, terrain: 'desert' })]);
    const city = {
      ...makeCity('c1'),
      specialists: 2,
      territory: [],
      buildings: [],
    };
    const base = calculateCityYields(city, state);
    expect(base.food).toBe(-2);

    const withZeal = calculateCityYieldsWithAdjacency(city, {
      ...state,
      cities: new Map([['c1', city]]),
      units: new Map([['cmd1', createTestUnit({
        id: 'cmd1',
        typeId: 'army_commander',
        owner: 'p1',
        position: city.position,
        promotions: ['leadership_zeal'],
      })]]),
      commanders: new Map([['cmd1', makeCommanderState({ unitId: 'cmd1' })]]),
    });

    expect(withZeal.food).toBe(-2);
    expect(withZeal.production).toBe(Math.floor(base.production * 105 / 100));
  });
});
