import { describe, it, expect } from 'vitest';
import { isWonderPlacementValid, wonderPlacementSystem } from '../wonderPlacementSystem';
import { WONDER_PLACEMENT_RULES } from '../../data/wonders/placement-rules';
import { createTestState } from './helpers';
import type { GameState, HexTile } from '../../types/GameState';
import type { HexCoord } from '../../types/HexCoord';
import { coordToKey } from '../../hex/HexMath';

/**
 * Small helper: mutate a fresh-state's tiles map to set terrain / feature /
 * resource / river on specific coords. The `createTestState` helper returns
 * a full grassland flat map.
 */
function withTiles(
  overrides: ReadonlyArray<{
    readonly coord: HexCoord;
    readonly terrain?: string;
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

  it('every rule has a non-empty description and matching id', () => {
    for (const [id, rule] of WONDER_PLACEMENT_RULES) {
      expect(rule.wonderId).toBe(id);
      expect(rule.description.length).toBeGreaterThan(0);
      expect(typeof rule.canPlace).toBe('function');
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
  it('valid on plains adjacent to mountains', () => {
    const state = withTiles([
      { coord: { q: 2, r: 2 }, terrain: 'plains' },
      { coord: { q: 3, r: 2 }, terrain: 'plains', feature: 'mountains' },
    ]);
    const result = isWonderPlacementValid('machu_picchu', { q: 2, r: 2 }, state);
    expect(result.valid).toBe(true);
  });

  it('invalid on plains with no adjacent mountain', () => {
    const state = withTiles([{ coord: { q: 2, r: 2 }, terrain: 'plains' }]);
    const result = isWonderPlacementValid('machu_picchu', { q: 2, r: 2 }, state);
    expect(result.valid).toBe(false);
  });

  it('invalid on grassland even if adjacent to mountain', () => {
    const state = withTiles([
      { coord: { q: 3, r: 2 }, terrain: 'plains', feature: 'mountains' },
    ]);
    // (2,2) is grassland (default), not plains — should fail.
    const result = isWonderPlacementValid('machu_picchu', { q: 2, r: 2 }, state);
    expect(result.valid).toBe(false);
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
