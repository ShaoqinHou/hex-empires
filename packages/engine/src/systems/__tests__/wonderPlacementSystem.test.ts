import { describe, it, expect } from 'vitest';
import { isWonderPlacementValid, wonderPlacementSystem } from '../wonderPlacementSystem';
import { WONDER_PLACEMENT_RULES } from '../../data/wonders/placement-rules';
import { createTestState } from './helpers';
import type { CityState, GameState, HexTile } from '../../types/GameState';
import type { DistrictSlot } from '../../types/District';
import type { HexCoord } from '../../types/HexCoord';
import type { TerrainId } from '../../types/Terrain';
import { coordToKey } from '../../hex/HexMath';

/**
 * Small helper: mutate a fresh-state's tiles map to set terrain / feature /
 * resource / river on specific coords. The `createTestState` helper returns
 * a full grassland flat map.
 */
function withTiles(
  overrides: ReadonlyArray<{
    readonly coord: HexCoord;
    readonly terrain?: TerrainId;
    readonly feature?: string | null;
    readonly resource?: string | null;
    readonly river?: ReadonlyArray<number>;
  }>,
): GameState {
  const base = createTestState();
  const tiles = new Map(base.map.tiles);
  for (const o of overrides) {
    const key = coordToKey(o.coord);
    const existing = tiles.get(key);
    if (!existing) continue;
    const next: HexTile = {
      ...existing,
      terrain: o.terrain ?? existing.terrain,
      feature: o.feature !== undefined ? o.feature : existing.feature,
      resource: o.resource !== undefined ? o.resource : existing.resource,
      river: o.river ?? existing.river,
    };
    tiles.set(key, next);
  }
  return { ...base, map: { ...base.map, tiles } };
}

describe('WONDER_PLACEMENT_RULES table', () => {
  it('exposes at least 6 rules', () => {
    expect(WONDER_PLACEMENT_RULES.size).toBeGreaterThanOrEqual(6);
  });

  it('every rule has a non-empty description, matching id, and a constraint', () => {
    for (const [id, rule] of WONDER_PLACEMENT_RULES) {
      expect(rule.wonderId).toBe(id);
      expect(rule.description.length).toBeGreaterThan(0);
      expect(typeof rule.constraint).toBe('object');
      expect(typeof rule.constraint.type).toBe('string');
    }
  });
});

describe('isWonderPlacementValid — pyramids', () => {
  it('valid on desert terrain', () => {
    const state = withTiles([{ coord: { q: 2, r: 2 }, terrain: 'desert' }]);
    const result = isWonderPlacementValid('pyramids', { q: 2, r: 2 }, state);
    expect(result.valid).toBe(true);
  });

  it('valid on floodplains feature', () => {
    const state = withTiles([
      { coord: { q: 3, r: 3 }, terrain: 'plains', feature: 'floodplains' },
    ]);
    const result = isWonderPlacementValid('pyramids', { q: 3, r: 3 }, state);
    expect(result.valid).toBe(true);
  });

  it('invalid on grassland (default) with no feature', () => {
    const state = createTestState();
    const result = isWonderPlacementValid('pyramids', { q: 4, r: 4 }, state);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('pyramids');
  });
});

describe('isWonderPlacementValid — stonehenge', () => {
  it('valid when adjacent tile has stone resource', () => {
    // (0,0) neighbour (1,0) holds stone
    const state = withTiles([
      { coord: { q: 1, r: 0 }, terrain: 'plains', resource: 'stone' },
    ]);
    const result = isWonderPlacementValid('stonehenge', { q: 0, r: 0 }, state);
    expect(result.valid).toBe(true);
  });

  it('invalid when no neighbouring tile has stone', () => {
    const state = createTestState();
    const result = isWonderPlacementValid('stonehenge', { q: 0, r: 0 }, state);
    expect(result.valid).toBe(false);
  });

  it('invalid when stone resource is 2 tiles away (not adjacent)', () => {
    const state = withTiles([
      { coord: { q: 3, r: 0 }, terrain: 'plains', resource: 'stone' },
    ]);
    const result = isWonderPlacementValid('stonehenge', { q: 0, r: 0 }, state);
    expect(result.valid).toBe(false);
  });
});

describe('isWonderPlacementValid — hanging_gardens', () => {
  it('valid when neighbouring tile has a river edge', () => {
    const state = withTiles([
      { coord: { q: 1, r: 0 }, river: [0, 1] },
    ]);
    const result = isWonderPlacementValid('hanging_gardens', { q: 0, r: 0 }, state);
    expect(result.valid).toBe(true);
  });

  it('valid when the candidate tile itself has a river edge', () => {
    const state = withTiles([
      { coord: { q: 2, r: 2 }, river: [3] },
    ]);
    const result = isWonderPlacementValid('hanging_gardens', { q: 2, r: 2 }, state);
    expect(result.valid).toBe(true);
  });

  it('invalid when no river exists anywhere nearby', () => {
    const state = createTestState();
    const result = isWonderPlacementValid('hanging_gardens', { q: 2, r: 2 }, state);
    expect(result.valid).toBe(false);
  });
});

describe('isWonderPlacementValid — colossus', () => {
  it('valid on land tile adjacent to coast', () => {
    // Candidate (1,1) is grassland (default); neighbour (2,1) is coast.
    const state = withTiles([
      { coord: { q: 2, r: 1 }, terrain: 'coast' },
    ]);
    const result = isWonderPlacementValid('colossus', { q: 1, r: 1 }, state);
    expect(result.valid).toBe(true);
  });

  it('invalid on inland tile with no coastal neighbour', () => {
    const state = createTestState();
    const result = isWonderPlacementValid('colossus', { q: 5, r: 5 }, state);
    expect(result.valid).toBe(false);
  });

  it('invalid when candidate tile is coast itself (must be land)', () => {
    const state = withTiles([
      { coord: { q: 1, r: 1 }, terrain: 'coast' },
      { coord: { q: 2, r: 1 }, terrain: 'coast' },
    ]);
    const result = isWonderPlacementValid('colossus', { q: 1, r: 1 }, state);
    expect(result.valid).toBe(false);
  });
});

describe('isWonderPlacementValid — oracle', () => {
  it('valid on a hills tile', () => {
    const state = withTiles([
      { coord: { q: 2, r: 2 }, terrain: 'plains', feature: 'hills' },
    ]);
    const result = isWonderPlacementValid('oracle', { q: 2, r: 2 }, state);
    expect(result.valid).toBe(true);
  });

  it('invalid on flat grassland', () => {
    const state = createTestState();
    const result = isWonderPlacementValid('oracle', { q: 2, r: 2 }, state);
    expect(result.valid).toBe(false);
  });
});

describe('isWonderPlacementValid — machu_picchu', () => {
  // Audit batch 1A: MACHU_PICCHU_RULE removed because no BuildingDef 'machu_picchu' exists.
  // Without a placement rule the wonder is unconstrained (returns valid:true for any tile).
  // TODO(content): restore specific placement tests when machu_picchu BuildingDef is added.

  it('returns valid:true (unconstrained — no BuildingDef exists yet)', () => {
    const state = withTiles([{ coord: { q: 2, r: 2 }, terrain: 'plains' }]);
    const result = isWonderPlacementValid('machu_picchu', { q: 2, r: 2 }, state);
    expect(result.valid).toBe(true);
  });

  it('returns valid:true even on non-plains with no mountain (unconstrained)', () => {
    const state = withTiles([
      { coord: { q: 3, r: 2 }, terrain: 'plains', feature: 'mountains' },
    ]);
    const result = isWonderPlacementValid('machu_picchu', { q: 2, r: 2 }, state);
    expect(result.valid).toBe(true);
  });
});

describe('isWonderPlacementValid — unknown wonder id', () => {
  it('returns valid:true (unconstrained)', () => {
    const state = createTestState();
    const result = isWonderPlacementValid('nonexistent_wonder', { q: 0, r: 0 }, state);
    expect(result.valid).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it('returns valid:true even on ocean (no rule means no constraint)', () => {
    const state = withTiles([{ coord: { q: 0, r: 0 }, terrain: 'ocean' }]);
    const result = isWonderPlacementValid('fictitious_wonder', { q: 0, r: 0 }, state);
    expect(result.valid).toBe(true);
  });
});

describe('isWonderPlacementValid — reason field', () => {
  it('includes the wonder id in the failure reason', () => {
    const state = createTestState();
    const result = isWonderPlacementValid('pyramids', { q: 0, r: 0 }, state);
    expect(result.valid).toBe(false);
    expect(result.reason).toBeDefined();
    expect(result.reason).toContain('pyramids');
  });
});

describe('wonderPlacementSystem (pipeline function)', () => {
  it('returns state unchanged for END_TURN', () => {
    const state = createTestState();
    const next = wonderPlacementSystem(state, { type: 'END_TURN' });
    expect(next).toBe(state);
  });

  it('returns state unchanged for PLACE_BUILDING', () => {
    const state = createTestState();
    const next = wonderPlacementSystem(state, {
      type: 'PLACE_BUILDING',
      cityId: 'c1',
      buildingId: 'pyramids',
      tile: { q: 0, r: 0 },
    });
    expect(next).toBe(state);
  });

  it('returns state unchanged for START_TURN', () => {
    const state = createTestState();
    const next = wonderPlacementSystem(state, { type: 'START_TURN' });
    expect(next).toBe(state);
  });
});

// ─── M13 additions ──────────────────────────────────────────────────────────

function makeCity(overrides: Partial<CityState> = {}): CityState {
  return {
    id: 'c1',
    name: 'Capital',
    owner: 'p1',
    position: { q: 5, r: 5 },
    population: 5,
    food: 0,
    productionQueue: [],
    productionProgress: 0,
    buildings: [],
    territory: [coordToKey({ q: 5, r: 5 })],
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

function makeDistrict(overrides: Partial<DistrictSlot> = {}): DistrictSlot {
  return {
    id: 'd1',
    type: 'holy_site',
    position: { q: 1, r: 0 },
    cityId: 'c1',
    level: 1,
    buildings: [],
    adjacencyBonus: 0,
    ...overrides,
  };
}

describe('isWonderPlacementValid — angkor_wat', () => {
  it('valid when a neighbour has a river edge', () => {
    const state = withTiles([{ coord: { q: 1, r: 0 }, river: [2] }]);
    const result = isWonderPlacementValid('angkor_wat', { q: 0, r: 0 }, state);
    expect(result.valid).toBe(true);
  });

  it('invalid on an interior tile with no river nearby', () => {
    const state = createTestState();
    const result = isWonderPlacementValid('angkor_wat', { q: 5, r: 5 }, state);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('angkor_wat');
  });
});

describe('isWonderPlacementValid — cristo_redentor', () => {
  it('valid when adjacent to a mountains feature', () => {
    const state = withTiles([
      { coord: { q: 3, r: 2 }, terrain: 'plains', feature: 'mountains' },
    ]);
    const result = isWonderPlacementValid('cristo_redentor', { q: 2, r: 2 }, state);
    expect(result.valid).toBe(true);
  });

  it('invalid when no mountain is adjacent', () => {
    const state = createTestState();
    const result = isWonderPlacementValid('cristo_redentor', { q: 5, r: 5 }, state);
    expect(result.valid).toBe(false);
  });
});

describe('isWonderPlacementValid — sydney_opera_house', () => {
  it('valid on a land tile whose neighbour is coast', () => {
    const state = withTiles([
      { coord: { q: 3, r: 2 }, terrain: 'coast' },
    ]);
    const result = isWonderPlacementValid('sydney_opera_house', { q: 2, r: 2 }, state);
    expect(result.valid).toBe(true);
  });

  it('valid on a land tile whose neighbour has a reef feature', () => {
    const state = withTiles([
      { coord: { q: 3, r: 2 }, terrain: 'coast', feature: 'reef' },
    ]);
    const result = isWonderPlacementValid('sydney_opera_house', { q: 2, r: 2 }, state);
    expect(result.valid).toBe(true);
  });

  it('invalid on a fully inland tile', () => {
    const state = createTestState();
    const result = isWonderPlacementValid('sydney_opera_house', { q: 5, r: 5 }, state);
    expect(result.valid).toBe(false);
  });

  it('invalid when candidate tile itself is ocean', () => {
    const state = withTiles([
      { coord: { q: 2, r: 2 }, terrain: 'ocean' },
      { coord: { q: 3, r: 2 }, terrain: 'coast' },
    ]);
    const result = isWonderPlacementValid('sydney_opera_house', { q: 2, r: 2 }, state);
    expect(result.valid).toBe(false);
  });
});

describe('isWonderPlacementValid — hagia_sophia', () => {
  it('falls back to valid when no holy sites exist in state', () => {
    const state = createTestState();
    const result = isWonderPlacementValid('hagia_sophia', { q: 4, r: 4 }, state);
    expect(result.valid).toBe(true);
  });

  it('valid when a holy site sits on a neighbouring tile', () => {
    const base = createTestState();
    const holySite = makeDistrict({ id: 'hs1', type: 'holy_site', position: { q: 1, r: 0 } });
    const state: GameState = {
      ...base,
      districts: new Map([[holySite.id, holySite]]),
    };
    const result = isWonderPlacementValid('hagia_sophia', { q: 0, r: 0 }, state);
    expect(result.valid).toBe(true);
  });

  it('invalid when a holy site exists but is not adjacent to the candidate', () => {
    const base = createTestState();
    const holySite = makeDistrict({ id: 'hs1', type: 'holy_site', position: { q: 8, r: 8 } });
    const state: GameState = {
      ...base,
      districts: new Map([[holySite.id, holySite]]),
    };
    const result = isWonderPlacementValid('hagia_sophia', { q: 0, r: 0 }, state);
    expect(result.valid).toBe(false);
  });

  it('ignores non-holy-site districts for the adjacency check', () => {
    const base = createTestState();
    const campus = makeDistrict({ id: 'cm1', type: 'campus', position: { q: 1, r: 0 } });
    const state: GameState = {
      ...base,
      districts: new Map([[campus.id, campus]]),
    };
    // No holy sites exist anywhere -> fallback to valid.
    const result = isWonderPlacementValid('hagia_sophia', { q: 0, r: 0 }, state);
    expect(result.valid).toBe(true);
  });
});

describe('isWonderPlacementValid — terracotta_army', () => {
  it('valid when the candidate tile is inside a capital\u2019s territory', () => {
    const base = createTestState();
    const capital = makeCity({
      position: { q: 2, r: 2 },
      territory: [coordToKey({ q: 2, r: 2 }), coordToKey({ q: 3, r: 2 })],
      isCapital: true,
    });
    const state: GameState = { ...base, cities: new Map([[capital.id, capital]]) };
    const result = isWonderPlacementValid('terracotta_army', { q: 3, r: 2 }, state);
    expect(result.valid).toBe(true);
  });

  it('invalid when the tile is inside a non-capital\u2019s territory', () => {
    const base = createTestState();
    const town = makeCity({
      position: { q: 2, r: 2 },
      territory: [coordToKey({ q: 2, r: 2 }), coordToKey({ q: 3, r: 2 })],
      isCapital: false,
    });
    const state: GameState = { ...base, cities: new Map([[town.id, town]]) };
    const result = isWonderPlacementValid('terracotta_army', { q: 3, r: 2 }, state);
    expect(result.valid).toBe(false);
  });

  it('invalid when no city owns the tile at all', () => {
    const state = createTestState();
    const result = isWonderPlacementValid('terracotta_army', { q: 0, r: 0 }, state);
    expect(result.valid).toBe(false);
  });
});

describe('isWonderPlacementValid — great_wall', () => {
  it('valid on a territory-edge tile (neighbour is unclaimed)', () => {
    const base = createTestState();
    const city = makeCity({
      position: { q: 2, r: 2 },
      territory: [coordToKey({ q: 2, r: 2 })], // single tile, every neighbour is "outside"
    });
    const state: GameState = { ...base, cities: new Map([[city.id, city]]) };
    const result = isWonderPlacementValid('great_wall', { q: 2, r: 2 }, state);
    expect(result.valid).toBe(true);
  });

  it('invalid on an interior tile fully surrounded by own territory', () => {
    const base = createTestState();
    const center: HexCoord = { q: 2, r: 2 };
    // (2,2) + all six neighbours — the center is fully interior.
    const territory = [
      coordToKey(center),
      coordToKey({ q: 3, r: 2 }),
      coordToKey({ q: 1, r: 2 }),
      coordToKey({ q: 2, r: 3 }),
      coordToKey({ q: 2, r: 1 }),
      coordToKey({ q: 3, r: 1 }),
      coordToKey({ q: 1, r: 3 }),
    ];
    const city = makeCity({ position: center, territory });
    const state: GameState = { ...base, cities: new Map([[city.id, city]]) };
    const result = isWonderPlacementValid('great_wall', center, state);
    expect(result.valid).toBe(false);
  });

  it('invalid when no city owns the tile', () => {
    const state = createTestState();
    const result = isWonderPlacementValid('great_wall', { q: 5, r: 5 }, state);
    expect(result.valid).toBe(false);
  });
});

describe('isWonderPlacementValid — brandenburg_gate', () => {
  it('valid on any tile (no geographic constraint)', () => {
    const state = createTestState();
    const result = isWonderPlacementValid('brandenburg_gate', { q: 0, r: 0 }, state);
    expect(result.valid).toBe(true);
  });

  it('valid even on water tiles', () => {
    const state = withTiles([{ coord: { q: 0, r: 0 }, terrain: 'ocean' }]);
    const result = isWonderPlacementValid('brandenburg_gate', { q: 0, r: 0 }, state);
    expect(result.valid).toBe(true);
  });
});

describe('isWonderPlacementValid — panama_canal', () => {
  it('valid with two non-adjacent water neighbours (east + west)', () => {
    // Around (2,2), neighbours are (3,2), (1,2), (2,3), (2,1), (3,1), (1,3).
    // (3,2) and (1,2) are on opposite sides — their own neighbour sets do
    // NOT overlap via adjacency, so the heuristic should fire.
    const state = withTiles([
      { coord: { q: 3, r: 2 }, terrain: 'ocean' },
      { coord: { q: 1, r: 2 }, terrain: 'ocean' },
    ]);
    const result = isWonderPlacementValid('panama_canal', { q: 2, r: 2 }, state);
    expect(result.valid).toBe(true);
  });

  it('invalid with only one water neighbour (single coastline)', () => {
    const state = withTiles([{ coord: { q: 3, r: 2 }, terrain: 'coast' }]);
    const result = isWonderPlacementValid('panama_canal', { q: 2, r: 2 }, state);
    expect(result.valid).toBe(false);
  });

  it('invalid when the candidate tile itself is water', () => {
    const state = withTiles([
      { coord: { q: 2, r: 2 }, terrain: 'ocean' },
      { coord: { q: 3, r: 2 }, terrain: 'ocean' },
      { coord: { q: 1, r: 2 }, terrain: 'ocean' },
    ]);
    const result = isWonderPlacementValid('panama_canal', { q: 2, r: 2 }, state);
    expect(result.valid).toBe(false);
  });
});

describe('WONDER_PLACEMENT_RULES — M13 coverage', () => {
  it('contains rules for all targeted M13 wonders', () => {
    const expected = [
      'angkor_wat',
      'cristo_redentor',
      'sydney_opera_house',
      'hagia_sophia',
      'terracotta_army',
      'great_wall',
      'brandenburg_gate',
      'panama_canal',
    ];
    for (const id of expected) {
      expect(WONDER_PLACEMENT_RULES.has(id)).toBe(true);
    }
  });
});
