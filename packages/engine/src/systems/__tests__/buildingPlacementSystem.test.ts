import { describe, it, expect } from 'vitest';
import { buildingPlacementSystem } from '../buildingPlacementSystem';
import { createTestState, createTestPlayer } from './helpers';
import type { CityState, HexTile } from '../../types/GameState';
import { coordToKey } from '../../hex/HexMath';

function createTestCity(overrides: Partial<CityState> = {}): CityState {
  return {
    id: 'c1',
    name: 'Rome',
    owner: 'p1',
    position: { q: 3, r: 3 },
    population: 5,
    food: 0,
    productionQueue: [],
    productionProgress: 0,
    buildings: ['granary'],
    territory: [
      coordToKey({ q: 3, r: 3 }),
      coordToKey({ q: 4, r: 3 }),
      coordToKey({ q: 3, r: 4 }),
      coordToKey({ q: 2, r: 4 }),
      coordToKey({ q: 2, r: 3 }),
    ],
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

describe('buildingPlacementSystem', () => {
  describe('pass-through', () => {
    it('returns state unchanged for unrelated actions', () => {
      const city = createTestCity();
      const state = createTestState({ cities: new Map([['c1', city]]) });
      const next = buildingPlacementSystem(state, { type: 'END_TURN' });
      expect(next).toBe(state);
    });

    it('returns state unchanged for START_TURN', () => {
      const state = createTestState();
      const next = buildingPlacementSystem(state, { type: 'START_TURN' });
      expect(next).toBe(state);
    });
  });

  describe('PLACE_BUILDING — valid placement', () => {
    it('places a building on a territory tile', () => {
      const city = createTestCity();
      const targetCoord = { q: 4, r: 3 };
      const state = createTestState({ cities: new Map([['c1', city]]) });

      const next = buildingPlacementSystem(state, {
        type: 'PLACE_BUILDING',
        cityId: 'c1',
        buildingId: 'granary',
        tile: targetCoord,
      });

      const tileKey = coordToKey(targetCoord);
      expect(next.map.tiles.get(tileKey)!.building).toBe('granary');
    });

    it('does not modify other tiles when placing a building', () => {
      const city = createTestCity();
      const targetCoord = { q: 4, r: 3 };
      const otherCoord = { q: 3, r: 3 };
      const state = createTestState({ cities: new Map([['c1', city]]) });

      const next = buildingPlacementSystem(state, {
        type: 'PLACE_BUILDING',
        cityId: 'c1',
        buildingId: 'granary',
        tile: targetCoord,
      });

      const otherKey = coordToKey(otherCoord);
      // Tile created by createFlatMap has no building field — falsy (undefined or null)
      expect(next.map.tiles.get(otherKey)!.building).toBeFalsy();
    });

    it('records a log entry on successful placement', () => {
      const city = createTestCity();
      const state = createTestState({ cities: new Map([['c1', city]]) });

      const next = buildingPlacementSystem(state, {
        type: 'PLACE_BUILDING',
        cityId: 'c1',
        buildingId: 'granary',
        tile: { q: 4, r: 3 },
      });

      expect(next.log.length).toBe(1);
      expect(next.log[0].type).toBe('production');
      expect(next.log[0].message).toContain('Granary');
      expect(next.log[0].message).toContain('Rome');
    });

    it('sets lastValidation to valid: true on success', () => {
      const city = createTestCity();
      const state = createTestState({ cities: new Map([['c1', city]]) });

      const next = buildingPlacementSystem(state, {
        type: 'PLACE_BUILDING',
        cityId: 'c1',
        buildingId: 'granary',
        tile: { q: 4, r: 3 },
      });

      expect(next.lastValidation).toEqual({ valid: true });
    });
  });

  describe('PLACE_BUILDING — invalid: city not found', () => {
    it('rejects placement when city does not exist', () => {
      const state = createTestState();

      const next = buildingPlacementSystem(state, {
        type: 'PLACE_BUILDING',
        cityId: 'nonexistent',
        buildingId: 'granary',
        tile: { q: 4, r: 3 },
      });

      expect(next.lastValidation).toEqual({
        valid: false,
        reason: 'City not found',
        category: 'general',
      });
      // Map must not change
      expect(next.map).toBe(state.map);
    });
  });

  describe('PLACE_BUILDING — invalid: foreign city', () => {
    it('rejects placement in a city owned by another player', () => {
      const city = createTestCity({ owner: 'p2' });
      const state = createTestState({
        cities: new Map([['c1', city]]),
        players: new Map([
          ['p1', createTestPlayer({ id: 'p1' })],
          ['p2', createTestPlayer({ id: 'p2', name: 'Player 2' })],
        ]),
      });

      const next = buildingPlacementSystem(state, {
        type: 'PLACE_BUILDING',
        cityId: 'c1',
        buildingId: 'granary',
        tile: { q: 4, r: 3 },
      });

      expect(next.lastValidation).toEqual({
        valid: false,
        reason: 'Cannot place buildings in foreign cities',
        category: 'general',
      });
    });
  });

  describe('PLACE_BUILDING — invalid: bad building id', () => {
    it('rejects placement with an unknown building type', () => {
      const city = createTestCity();
      const state = createTestState({ cities: new Map([['c1', city]]) });

      const next = buildingPlacementSystem(state, {
        type: 'PLACE_BUILDING',
        cityId: 'c1',
        buildingId: 'nonexistent_building' as any,
        tile: { q: 4, r: 3 },
      });

      expect(next.lastValidation).toEqual({
        valid: false,
        reason: 'Invalid building type',
        category: 'general',
      });
    });
  });

  describe('PLACE_BUILDING — invalid: tile outside territory', () => {
    it('rejects placement on a tile not in city territory', () => {
      const city = createTestCity();
      const state = createTestState({ cities: new Map([['c1', city]]) });

      // { q: 9, r: 9 } is on the map but not in city territory
      const next = buildingPlacementSystem(state, {
        type: 'PLACE_BUILDING',
        cityId: 'c1',
        buildingId: 'granary',
        tile: { q: 9, r: 9 },
      });

      expect(next.lastValidation).toEqual({
        valid: false,
        reason: 'Tile must be within city territory',
        category: 'general',
      });
    });
  });

  describe('PLACE_BUILDING — invalid: tile already occupied', () => {
    it('rejects placement on a tile that already has a building', () => {
      const city = createTestCity();
      const occupiedCoord = { q: 4, r: 3 };
      const occupiedKey = coordToKey(occupiedCoord);

      const baseState = createTestState({ cities: new Map([['c1', city]]) });
      // Pre-place a building on that tile
      const newTiles = new Map(baseState.map.tiles);
      const existingTile = newTiles.get(occupiedKey)!;
      const occupiedTile: HexTile = { ...existingTile, building: 'granary' };
      newTiles.set(occupiedKey, occupiedTile);
      const state = { ...baseState, map: { ...baseState.map, tiles: newTiles } };

      const next = buildingPlacementSystem(state, {
        type: 'PLACE_BUILDING',
        cityId: 'c1',
        buildingId: 'granary',
        tile: occupiedCoord,
      });

      expect(next.lastValidation).toEqual({
        valid: false,
        reason: 'Tile already has a building',
        category: 'general',
      });
      // Tile must remain unchanged
      expect(next.map.tiles.get(occupiedKey)!.building).toBe('granary');
    });
  });

  describe('PLACE_BUILDING — invalid: building not yet constructed', () => {
    it('rejects placement when the building has not been produced by the city', () => {
      // City has no buildings in its buildings list
      const city = createTestCity({ buildings: [] });
      const state = createTestState({ cities: new Map([['c1', city]]) });

      const next = buildingPlacementSystem(state, {
        type: 'PLACE_BUILDING',
        cityId: 'c1',
        buildingId: 'granary',
        tile: { q: 4, r: 3 },
      });

      expect(next.lastValidation).toEqual({
        valid: false,
        reason: 'Building has not been constructed yet',
        category: 'production',
      });
    });

    it('rejects placement of a building the city produced a different building', () => {
      // City has 'monument' but not 'granary'
      const city = createTestCity({ buildings: ['monument'] });
      const state = createTestState({ cities: new Map([['c1', city]]) });

      const next = buildingPlacementSystem(state, {
        type: 'PLACE_BUILDING',
        cityId: 'c1',
        buildingId: 'granary',
        tile: { q: 4, r: 3 },
      });

      expect(next.lastValidation).toEqual({
        valid: false,
        reason: 'Building has not been constructed yet',
        category: 'production',
      });
    });
  });

  describe('PLACE_BUILDING — state immutability', () => {
    it('does not mutate the original state on a valid placement', () => {
      const city = createTestCity();
      const state = createTestState({ cities: new Map([['c1', city]]) });
      const originalTileKey = coordToKey({ q: 4, r: 3 });
      const originalBuilding = state.map.tiles.get(originalTileKey)!.building;

      buildingPlacementSystem(state, {
        type: 'PLACE_BUILDING',
        cityId: 'c1',
        buildingId: 'granary',
        tile: { q: 4, r: 3 },
      });

      // Original state tile must still have no building
      expect(state.map.tiles.get(originalTileKey)!.building).toBe(originalBuilding);
    });

    it('returns a new state reference on valid placement', () => {
      const city = createTestCity();
      const state = createTestState({ cities: new Map([['c1', city]]) });

      const next = buildingPlacementSystem(state, {
        type: 'PLACE_BUILDING',
        cityId: 'c1',
        buildingId: 'granary',
        tile: { q: 4, r: 3 },
      });

      expect(next).not.toBe(state);
    });
  });

  describe('PLACE_BUILDING — log turn attribution', () => {
    it('records the correct turn in the log entry', () => {
      const city = createTestCity();
      const state = createTestState({
        turn: 7,
        cities: new Map([['c1', city]]),
      });

      const next = buildingPlacementSystem(state, {
        type: 'PLACE_BUILDING',
        cityId: 'c1',
        buildingId: 'granary',
        tile: { q: 4, r: 3 },
      });

      expect(next.log[0].turn).toBe(7);
      expect(next.log[0].playerId).toBe('p1');
    });
  });
});
