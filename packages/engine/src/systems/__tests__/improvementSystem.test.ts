import { describe, it, expect } from 'vitest';
import { improvementSystem } from '../improvementSystem';
import { createTestState, createTestPlayer, createTestUnit } from './helpers';
import { coordToKey } from '../../hex/HexMath';
import type { HexCoord } from '../../types/HexCoord';

// Helper: place a resource on a tile
function setTileResource(
  tiles: Map<string, any>,
  coord: HexCoord,
  resource: string,
): void {
  const key = coordToKey(coord);
  const existing = tiles.get(key);
  if (existing) {
    tiles.set(key, { ...existing, resource });
  }
}

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
  describe('BUILD_IMPROVEMENT — valid farm', () => {
    it('places a farm on a grassland tile, removes builder, and logs', () => {
      const builderPos: HexCoord = { q: 2, r: 2 };
      const units = new Map([
        ['b1', createTestUnit({ id: 'b1', typeId: 'builder', position: builderPos })],
      ]);
      const state = createTestState({ units });

      const next = improvementSystem(state, {
        type: 'BUILD_IMPROVEMENT',
        unitId: 'b1',
        tile: builderPos,
        improvementId: 'farm',
      });

      // Builder is consumed
      expect(next.units.has('b1')).toBe(false);

      // Tile now has the farm improvement
      const tileKey = coordToKey(builderPos);
      const tile = next.map.tiles.get(tileKey);
      expect(tile?.improvement).toBe('farm');

      // A log entry was added
      expect(next.log.length).toBe(1);
      expect(next.log[0].type).toBe('production');
      expect(next.log[0].message).toContain('Farm');
      expect(next.log[0].message).toContain('2');
    });

    it('logs the tile coordinates', () => {
      const builderPos: HexCoord = { q: 3, r: 1 };
      const units = new Map([
        ['b1', createTestUnit({ id: 'b1', typeId: 'builder', position: builderPos })],
      ]);
      const state = createTestState({ units });

      const next = improvementSystem(state, {
        type: 'BUILD_IMPROVEMENT',
        unitId: 'b1',
        tile: builderPos,
        improvementId: 'farm',
      });

      expect(next.log[0].message).toContain('3');
      expect(next.log[0].message).toContain('1');
    });

    it('preserves all other tiles unchanged', () => {
      const builderPos: HexCoord = { q: 2, r: 2 };
      const otherPos: HexCoord = { q: 3, r: 3 };
      const units = new Map([
        ['b1', createTestUnit({ id: 'b1', typeId: 'builder', position: builderPos })],
      ]);
      const state = createTestState({ units });

      const next = improvementSystem(state, {
        type: 'BUILD_IMPROVEMENT',
        unitId: 'b1',
        tile: builderPos,
        improvementId: 'farm',
      });

      const otherKey = coordToKey(otherPos);
      const otherTile = next.map.tiles.get(otherKey);
      expect(otherTile?.improvement ?? null).toBeNull();
    });
  });

  describe('BUILD_IMPROVEMENT — tech-required mine', () => {
    it('builds a mine when player has mining tech, resource, and correct terrain', () => {
      const builderPos: HexCoord = { q: 1, r: 1 };
      const tiles = new Map(createTestState().map.tiles);
      setTileTerrain(tiles, builderPos, 'hills');
      setTileResource(tiles, builderPos, 'iron');

      const playerWithMining = createTestPlayer({
        id: 'p1',
        researchedTechs: ['mining'],
      });
      const units = new Map([
        ['b1', createTestUnit({ id: 'b1', typeId: 'builder', position: builderPos })],
      ]);
      const state = createTestState({
        units,
        players: new Map([['p1', playerWithMining]]),
        map: { width: 10, height: 10, tiles, wrapX: false },
      });

      const next = improvementSystem(state, {
        type: 'BUILD_IMPROVEMENT',
        unitId: 'b1',
        tile: builderPos,
        improvementId: 'mine',
      });

      expect(next.units.has('b1')).toBe(false);
      const tileKey = coordToKey(builderPos);
      expect(next.map.tiles.get(tileKey)?.improvement).toBe('mine');
    });

    it('rejects mine when player lacks mining tech', () => {
      const builderPos: HexCoord = { q: 1, r: 1 };
      const tiles = new Map(createTestState().map.tiles);
      setTileTerrain(tiles, builderPos, 'hills');
      setTileResource(tiles, builderPos, 'iron');

      const units = new Map([
        ['b1', createTestUnit({ id: 'b1', typeId: 'builder', position: builderPos })],
      ]);
      const state = createTestState({
        units,
        map: { width: 10, height: 10, tiles, wrapX: false },
      });

      const next = improvementSystem(state, {
        type: 'BUILD_IMPROVEMENT',
        unitId: 'b1',
        tile: builderPos,
        improvementId: 'mine',
      });

      // Action rejected — builder survives, no improvement
      expect(next.units.has('b1')).toBe(true);
      const tileKey = coordToKey(builderPos);
      expect(next.map.tiles.get(tileKey)?.improvement ?? null).toBeNull();
    });
  });

  describe('BUILD_IMPROVEMENT — invalid cases', () => {
    it('rejects when unit does not exist', () => {
      const state = createTestState();
      const next = improvementSystem(state, {
        type: 'BUILD_IMPROVEMENT',
        unitId: 'nonexistent',
        tile: { q: 0, r: 0 },
        improvementId: 'farm',
      });
      expect(next).toBe(state);
    });

    it('rejects when improvement id is unknown', () => {
      const builderPos: HexCoord = { q: 2, r: 2 };
      const units = new Map([
        ['b1', createTestUnit({ id: 'b1', typeId: 'builder', position: builderPos })],
      ]);
      const state = createTestState({ units });

      const next = improvementSystem(state, {
        type: 'BUILD_IMPROVEMENT',
        unitId: 'b1',
        tile: builderPos,
        improvementId: 'unknown_improvement',
      });

      expect(next).toBe(state);
    });

    it('rejects when unit is not a builder (lacks build_improvement ability)', () => {
      const warriorPos: HexCoord = { q: 2, r: 2 };
      const units = new Map([
        ['w1', createTestUnit({ id: 'w1', typeId: 'warrior', position: warriorPos })],
      ]);
      const state = createTestState({ units });

      const next = improvementSystem(state, {
        type: 'BUILD_IMPROVEMENT',
        unitId: 'w1',
        tile: warriorPos,
        improvementId: 'farm',
      });

      // Warrior cannot build — state unchanged
      expect(next.units.has('w1')).toBe(true);
      const tileKey = coordToKey(warriorPos);
      expect(next.map.tiles.get(tileKey)?.improvement ?? null).toBeNull();
    });

    it('rejects when unit is not on the target tile', () => {
      const builderPos: HexCoord = { q: 2, r: 2 };
      const targetTile: HexCoord = { q: 4, r: 4 };
      const units = new Map([
        ['b1', createTestUnit({ id: 'b1', typeId: 'builder', position: builderPos })],
      ]);
      const state = createTestState({ units });

      const next = improvementSystem(state, {
        type: 'BUILD_IMPROVEMENT',
        unitId: 'b1',
        tile: targetTile,
        improvementId: 'farm',
      });

      // Builder must be on the tile — action rejected
      expect(next.units.has('b1')).toBe(true);
      const tileKey = coordToKey(targetTile);
      expect(next.map.tiles.get(tileKey)?.improvement ?? null).toBeNull();
    });

    it('rejects when tile already has an improvement', () => {
      const builderPos: HexCoord = { q: 2, r: 2 };
      const tiles = new Map(createTestState().map.tiles);
      setTileImprovement(tiles, builderPos, 'farm');

      const units = new Map([
        ['b1', createTestUnit({ id: 'b1', typeId: 'builder', position: builderPos })],
      ]);
      const state = createTestState({
        units,
        map: { width: 10, height: 10, tiles, wrapX: false },
      });

      const next = improvementSystem(state, {
        type: 'BUILD_IMPROVEMENT',
        unitId: 'b1',
        tile: builderPos,
        improvementId: 'farm',
      });

      // Tile already improved — builder survives
      expect(next.units.has('b1')).toBe(true);
    });

    it('rejects farm on ocean terrain (wrong terrain prerequisite)', () => {
      const builderPos: HexCoord = { q: 2, r: 2 };
      const tiles = new Map(createTestState().map.tiles);
      setTileTerrain(tiles, builderPos, 'ocean');

      const units = new Map([
        ['b1', createTestUnit({ id: 'b1', typeId: 'builder', position: builderPos })],
      ]);
      const state = createTestState({
        units,
        map: { width: 10, height: 10, tiles, wrapX: false },
      });

      const next = improvementSystem(state, {
        type: 'BUILD_IMPROVEMENT',
        unitId: 'b1',
        tile: builderPos,
        improvementId: 'farm',
      });

      // Ocean doesn't match farm's allowed terrains
      expect(next.units.has('b1')).toBe(true);
      const tileKey = coordToKey(builderPos);
      expect(next.map.tiles.get(tileKey)?.improvement ?? null).toBeNull();
    });

    it('rejects pasture when tile has no valid resource', () => {
      const builderPos: HexCoord = { q: 2, r: 2 };
      const playerWithTech = createTestPlayer({
        id: 'p1',
        researchedTechs: ['animal_husbandry'],
      });
      // Grassland but no cattle/horses/sheep resource
      const units = new Map([
        ['b1', createTestUnit({ id: 'b1', typeId: 'builder', position: builderPos })],
      ]);
      const state = createTestState({
        units,
        players: new Map([['p1', playerWithTech]]),
      });

      const next = improvementSystem(state, {
        type: 'BUILD_IMPROVEMENT',
        unitId: 'b1',
        tile: builderPos,
        improvementId: 'pasture',
      });

      expect(next.units.has('b1')).toBe(true);
      const tileKey = coordToKey(builderPos);
      expect(next.map.tiles.get(tileKey)?.improvement ?? null).toBeNull();
    });

    it('rejects road when player lacks wheel tech', () => {
      const builderPos: HexCoord = { q: 2, r: 2 };
      const units = new Map([
        ['b1', createTestUnit({ id: 'b1', typeId: 'builder', position: builderPos })],
      ]);
      const state = createTestState({ units });

      const next = improvementSystem(state, {
        type: 'BUILD_IMPROVEMENT',
        unitId: 'b1',
        tile: builderPos,
        improvementId: 'road',
      });

      expect(next.units.has('b1')).toBe(true);
      const tileKey = coordToKey(builderPos);
      expect(next.map.tiles.get(tileKey)?.improvement ?? null).toBeNull();
    });
  });

  describe('BUILD_IMPROVEMENT — road with tech', () => {
    it('builds a road when player has wheel tech and terrain is valid', () => {
      const builderPos: HexCoord = { q: 2, r: 2 };
      const playerWithWheel = createTestPlayer({
        id: 'p1',
        researchedTechs: ['wheel'],
      });
      const units = new Map([
        ['b1', createTestUnit({ id: 'b1', typeId: 'builder', position: builderPos })],
      ]);
      const state = createTestState({
        units,
        players: new Map([['p1', playerWithWheel]]),
      });

      const next = improvementSystem(state, {
        type: 'BUILD_IMPROVEMENT',
        unitId: 'b1',
        tile: builderPos,
        improvementId: 'road',
      });

      expect(next.units.has('b1')).toBe(false);
      const tileKey = coordToKey(builderPos);
      expect(next.map.tiles.get(tileKey)?.improvement).toBe('road');
    });
  });

  describe('pass-through', () => {
    it('returns state unchanged for non-BUILD_IMPROVEMENT actions', () => {
      const state = createTestState();
      const next = improvementSystem(state, { type: 'END_TURN' });
      expect(next).toBe(state);
    });

    it('returns state unchanged for START_TURN action', () => {
      const state = createTestState();
      const next = improvementSystem(state, { type: 'START_TURN' });
      expect(next).toBe(state);
    });

    it('does not mutate state on valid build', () => {
      const builderPos: HexCoord = { q: 2, r: 2 };
      const units = new Map([
        ['b1', createTestUnit({ id: 'b1', typeId: 'builder', position: builderPos })],
      ]);
      const state = createTestState({ units });
      const originalUnitCount = state.units.size;
      const originalTileKey = coordToKey(builderPos);
      const originalTile = state.map.tiles.get(originalTileKey);

      improvementSystem(state, {
        type: 'BUILD_IMPROVEMENT',
        unitId: 'b1',
        tile: builderPos,
        improvementId: 'farm',
      });

      // Original state is not mutated
      expect(state.units.size).toBe(originalUnitCount);
      expect(state.map.tiles.get(originalTileKey)).toBe(originalTile);
    });
  });

  describe('seeded RNG invariance', () => {
    it('produces the same result for the same input (determinism)', () => {
      const builderPos: HexCoord = { q: 2, r: 2 };
      const units = new Map([
        ['b1', createTestUnit({ id: 'b1', typeId: 'builder', position: builderPos })],
      ]);
      const state = createTestState({ units, rng: { seed: 42, counter: 0 } });
      const action = {
        type: 'BUILD_IMPROVEMENT' as const,
        unitId: 'b1',
        tile: builderPos,
        improvementId: 'farm',
      };

      const result1 = improvementSystem(state, action);
      const result2 = improvementSystem(state, action);

      expect(result1.map.tiles.get(coordToKey(builderPos))?.improvement).toBe(
        result2.map.tiles.get(coordToKey(builderPos))?.improvement,
      );
      expect(result1.units.has('b1')).toBe(result2.units.has('b1'));
    });
  });
});
