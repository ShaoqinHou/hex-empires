import { describe, it, expect } from 'vitest';
import { improvementSystem } from '../improvementSystem';
import { createTestState, createTestPlayer, createTestCity } from './helpers';
import { coordToKey } from '../../hex/HexMath';
import type { HexCoord } from '../../types/HexCoord';

// Helper: mark a tile as already improved
function setTileImprovement(
  tiles: Map<string, any>,
  coord: HexCoord,
  improvement: string,
): void {
  const key = coordToKey(coord);
  const existing = tiles.get(key);
  if (existing) {
    tiles.set(key, { ...existing, improvement });
  }
}

// Helper: set terrain on a tile
function setTileTerrain(
  tiles: Map<string, any>,
  coord: HexCoord,
  terrain: string,
): void {
  const key = coordToKey(coord);
  const existing = tiles.get(key);
  if (existing) {
    tiles.set(key, { ...existing, terrain });
  }
}

describe('improvementSystem', () => {
  describe('PLACE_IMPROVEMENT (W2-01)', () => {
    it('places a farm on a grassland tile and logs', () => {
      const cityPos: HexCoord = { q: 2, r: 2 };
      const targetTile: HexCoord = { q: 3, r: 2 };

      const player = createTestPlayer({ id: 'p1' });
      const city = createTestCity({ id: 'c1', owner: 'p1', position: cityPos });

      const state = createTestState({
        players: new Map([['p1', {
          ...player,
          pendingGrowthChoices: [{ cityId: 'c1', triggeredOnTurn: 1 }],
        }]]),
        cities: new Map([['c1', city]]),
      });

      const next = improvementSystem(state, {
        type: 'PLACE_IMPROVEMENT',
        cityId: 'c1',
        tile: targetTile,
      });

      // Tile now has an improvement (farm on grassland)
      const tileKey = coordToKey(targetTile);
      const tile = next.map.tiles.get(tileKey);
      expect(tile?.improvement).toBe('farm');

      // A log entry was added
      expect(next.log.length).toBe(1);
      expect(next.log[0].type).toBe('production');

      // pendingGrowthChoice for c1 is cleared
      const updatedPlayer = next.players.get('p1');
      expect(updatedPlayer?.pendingGrowthChoices?.some(c => c.cityId === 'c1')).toBe(false);
    });

    it('rejects when city does not exist', () => {
      const state = createTestState();
      const next = improvementSystem(state, {
        type: 'PLACE_IMPROVEMENT',
        cityId: 'nonexistent',
        tile: { q: 2, r: 2 },
      });
      expect(next).toBe(state);
    });

    it('rejects when tile already has an improvement', () => {
      const cityPos: HexCoord = { q: 2, r: 2 };
      const targetTile: HexCoord = { q: 3, r: 2 };
      const tiles = new Map(createTestState().map.tiles);
      setTileImprovement(tiles, targetTile, 'farm');

      const player = createTestPlayer({ id: 'p1' });
      const city = createTestCity({ id: 'c1', owner: 'p1', position: cityPos });

      const state = createTestState({
        players: new Map([['p1', {
          ...player,
          pendingGrowthChoices: [{ cityId: 'c1', triggeredOnTurn: 1 }],
        }]]),
        cities: new Map([['c1', city]]),
        map: { width: 10, height: 10, tiles, wrapX: false },
      });

      const next = improvementSystem(state, {
        type: 'PLACE_IMPROVEMENT',
        cityId: 'c1',
        tile: targetTile,
      });

      // Already improved — no-op
      expect(next).toBe(state);
    });

    it('rejects when tile is ocean (no derivable improvement)', () => {
      const cityPos: HexCoord = { q: 2, r: 2 };
      const targetTile: HexCoord = { q: 3, r: 2 };
      const tiles = new Map(createTestState().map.tiles);
      setTileTerrain(tiles, targetTile, 'ocean');

      const player = createTestPlayer({ id: 'p1' });
      const city = createTestCity({ id: 'c1', owner: 'p1', position: cityPos });

      const state = createTestState({
        players: new Map([['p1', {
          ...player,
          pendingGrowthChoices: [{ cityId: 'c1', triggeredOnTurn: 1 }],
        }]]),
        cities: new Map([['c1', city]]),
        map: { width: 10, height: 10, tiles, wrapX: false },
      });

      const next = improvementSystem(state, {
        type: 'PLACE_IMPROVEMENT',
        cityId: 'c1',
        tile: targetTile,
      });

      // Ocean has no derivable improvement — state unchanged
      expect(next).toBe(state);
    });

    it('does not mutate original state', () => {
      const cityPos: HexCoord = { q: 2, r: 2 };
      const targetTile: HexCoord = { q: 3, r: 2 };

      const player = createTestPlayer({ id: 'p1' });
      const city = createTestCity({ id: 'c1', owner: 'p1', position: cityPos });

      const state = createTestState({
        players: new Map([['p1', {
          ...player,
          pendingGrowthChoices: [{ cityId: 'c1', triggeredOnTurn: 1 }],
        }]]),
        cities: new Map([['c1', city]]),
      });

      const tileKey = coordToKey(targetTile);
      const originalTile = state.map.tiles.get(tileKey);

      improvementSystem(state, {
        type: 'PLACE_IMPROVEMENT',
        cityId: 'c1',
        tile: targetTile,
      });

      // Original state not mutated
      expect(state.map.tiles.get(tileKey)).toBe(originalTile);
    });
  });

  describe('pass-through', () => {
    it('returns state unchanged for END_TURN', () => {
      const state = createTestState();
      const next = improvementSystem(state, { type: 'END_TURN' });
      expect(next).toBe(state);
    });

    it('returns state unchanged for START_TURN', () => {
      const state = createTestState();
      const next = improvementSystem(state, { type: 'START_TURN' });
      expect(next).toBe(state);
    });
  });
});
