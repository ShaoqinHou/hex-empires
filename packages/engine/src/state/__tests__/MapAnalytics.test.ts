import { describe, it, expect } from 'vitest';
import {
  terrainDistribution,
  featureDistribution,
  landRatio,
  riverTileCount,
  resourceCount,
  passableLandTiles,
} from '../MapAnalytics';
import { createTestState } from '../../systems/__tests__/helpers';
import { coordToKey } from '../../hex/HexMath';
import type { GameState, HexTile } from '../../types/GameState';

/**
 * Build a GameState with an exact set of tiles. `tiles` may be an array of
 * partial hex tiles — each entry is filled with safe defaults for fields the
 * map-analytics helpers don't care about.
 */
function stateWithTiles(tiles: ReadonlyArray<Partial<HexTile> & { coord: { q: number; r: number } }>): GameState {
  const map = new Map<string, HexTile>();
  for (const partial of tiles) {
    const full: HexTile = {
      coord: partial.coord,
      terrain: partial.terrain ?? 'grassland',
      feature: partial.feature ?? null,
      resource: partial.resource ?? null,
      river: partial.river ?? [],
      elevation: partial.elevation ?? 0.5,
      continent: partial.continent ?? 1,
    };
    map.set(coordToKey(full.coord), full);
  }
  return createTestState({
    map: { width: 0, height: 0, tiles: map, wrapX: false },
  });
}

function emptyState(): GameState {
  return createTestState({
    map: { width: 0, height: 0, tiles: new Map(), wrapX: false },
  });
}

describe('MapAnalytics', () => {
  describe('terrainDistribution', () => {
    it('returns an empty map for an empty grid', () => {
      const dist = terrainDistribution(emptyState());
      expect(dist.size).toBe(0);
    });

    it('counts tiles per terrain id exactly', () => {
      const state = stateWithTiles([
        { coord: { q: 0, r: 0 }, terrain: 'grassland' },
        { coord: { q: 1, r: 0 }, terrain: 'grassland' },
        { coord: { q: 2, r: 0 }, terrain: 'plains' },
        { coord: { q: 0, r: 1 }, terrain: 'desert' },
        { coord: { q: 1, r: 1 }, terrain: 'ocean' },
        { coord: { q: 2, r: 1 }, terrain: 'ocean' },
        { coord: { q: 3, r: 1 }, terrain: 'ocean' },
      ]);
      const dist = terrainDistribution(state);
      expect(dist.get('grassland')).toBe(2);
      expect(dist.get('plains')).toBe(1);
      expect(dist.get('desert')).toBe(1);
      expect(dist.get('ocean')).toBe(3);
      expect(dist.size).toBe(4);
    });
  });

  describe('featureDistribution', () => {
    it('returns an empty map for an empty grid', () => {
      expect(featureDistribution(emptyState()).size).toBe(0);
    });

    it('excludes tiles with feature: null', () => {
      const state = stateWithTiles([
        { coord: { q: 0, r: 0 }, feature: null },
        { coord: { q: 1, r: 0 }, feature: null },
        { coord: { q: 2, r: 0 }, feature: 'forest' },
        { coord: { q: 0, r: 1 }, feature: 'forest' },
        { coord: { q: 1, r: 1 }, feature: 'jungle' },
      ]);
      const dist = featureDistribution(state);
      expect(dist.get('forest')).toBe(2);
      expect(dist.get('jungle')).toBe(1);
      expect(dist.size).toBe(2);
      expect(dist.has('null')).toBe(false);
    });

    it('returns empty map when every tile has no feature', () => {
      const state = stateWithTiles([
        { coord: { q: 0, r: 0 }, feature: null },
        { coord: { q: 1, r: 0 }, feature: null },
      ]);
      expect(featureDistribution(state).size).toBe(0);
    });
  });

  describe('landRatio', () => {
    it('returns 0 for an empty map', () => {
      expect(landRatio(emptyState())).toBe(0);
    });

    it('returns 0 when every tile is water', () => {
      const state = stateWithTiles([
        { coord: { q: 0, r: 0 }, terrain: 'ocean' },
        { coord: { q: 1, r: 0 }, terrain: 'coast' },
        { coord: { q: 2, r: 0 }, terrain: 'reef' },
      ]);
      expect(landRatio(state)).toBe(0);
    });

    it('returns 1 when every tile is land (grassland)', () => {
      const state = stateWithTiles([
        { coord: { q: 0, r: 0 }, terrain: 'grassland' },
        { coord: { q: 1, r: 0 }, terrain: 'grassland' },
        { coord: { q: 2, r: 0 }, terrain: 'grassland' },
        { coord: { q: 3, r: 0 }, terrain: 'grassland' },
      ]);
      expect(landRatio(state)).toBe(1);
    });

    it('returns exact fraction for a mixed map', () => {
      // 3 land (grassland, plains, mountains) + 1 water (ocean) = 0.75
      const state = stateWithTiles([
        { coord: { q: 0, r: 0 }, terrain: 'grassland' },
        { coord: { q: 1, r: 0 }, terrain: 'plains' },
        { coord: { q: 2, r: 0 }, terrain: 'mountains' },
        { coord: { q: 0, r: 1 }, terrain: 'ocean' },
      ]);
      expect(landRatio(state)).toBe(0.75);
    });
  });

  describe('riverTileCount', () => {
    it('returns 0 for an empty map', () => {
      expect(riverTileCount(emptyState())).toBe(0);
    });

    it('counts only tiles whose river array is non-empty', () => {
      const state = stateWithTiles([
        { coord: { q: 0, r: 0 }, river: [] },
        { coord: { q: 1, r: 0 }, river: [0] },
        { coord: { q: 2, r: 0 }, river: [1, 2] },
        { coord: { q: 3, r: 0 }, river: [] },
      ]);
      expect(riverTileCount(state)).toBe(2);
    });
  });

  describe('resourceCount', () => {
    it('returns an empty map for an empty grid', () => {
      expect(resourceCount(emptyState()).size).toBe(0);
    });

    it('excludes tiles with resource: null', () => {
      const state = stateWithTiles([
        { coord: { q: 0, r: 0 }, resource: null },
        { coord: { q: 1, r: 0 }, resource: 'iron' },
        { coord: { q: 2, r: 0 }, resource: 'iron' },
        { coord: { q: 0, r: 1 }, resource: 'horses' },
      ]);
      const counts = resourceCount(state);
      expect(counts.get('iron')).toBe(2);
      expect(counts.get('horses')).toBe(1);
      expect(counts.size).toBe(2);
    });
  });

  describe('passableLandTiles', () => {
    it('returns 0 for an empty map', () => {
      expect(passableLandTiles(emptyState())).toBe(0);
    });

    it('excludes both water tiles and mountains', () => {
      const state = stateWithTiles([
        { coord: { q: 0, r: 0 }, terrain: 'grassland' },
        { coord: { q: 1, r: 0 }, terrain: 'plains' },
        { coord: { q: 2, r: 0 }, terrain: 'desert' },
        { coord: { q: 0, r: 1 }, terrain: 'mountains' },
        { coord: { q: 1, r: 1 }, terrain: 'mountains' },
        { coord: { q: 2, r: 1 }, terrain: 'ocean' },
        { coord: { q: 3, r: 1 }, terrain: 'coast' },
      ]);
      expect(passableLandTiles(state)).toBe(3);
    });
  });
});
