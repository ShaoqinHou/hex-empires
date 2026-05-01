import { describe, it, expect } from 'vitest';
import { visibilitySystem } from '../visibilitySystem';
import { createTestState, createTestPlayer, createTestUnit } from './helpers';
import type { CityState } from '../../types/GameState';
import { coordToKey } from '../../hex/HexMath';

// Minimal CityState factory
function createTestCity(overrides: Partial<CityState> = {}): CityState {
  return {
    id: 'city1',
    name: 'Rome',
    owner: 'p1',
    position: { q: 0, r: 0 },
    population: 1,
    food: 0,
    productionQueue: [],
    productionProgress: 0,
    buildings: [],
    territory: [coordToKey({ q: 0, r: 0 })],
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

describe('visibilitySystem', () => {
  describe('action routing', () => {
    it('ignores END_TURN and returns state unchanged', () => {
      const state = createTestState();
      const next = visibilitySystem(state, { type: 'END_TURN' });
      expect(next).toBe(state);
    });

    it('ignores MOVE_UNIT for a missing unit and returns state unchanged', () => {
      const state = createTestState();
      const next = visibilitySystem(state, {
        type: 'MOVE_UNIT',
        unitId: 'u1',
        path: [{ q: 1, r: 0 }],
      });
      expect(next).toBe(state);
    });

    it('MOVE_UNIT reveals around the unit position already present in state', () => {
      const units = new Map([
        ['u1', createTestUnit({ id: 'u1', owner: 'p1', position: { q: 1, r: 0 }, typeId: 'warrior' })],
      ]);
      const state = createTestState({ units });
      const next = visibilitySystem(state, {
        type: 'MOVE_UNIT',
        unitId: 'u1',
        path: [{ q: 1, r: 0 }],
      });

      const visibility = next.players.get('p1')!.visibility;
      expect(visibility.has(coordToKey({ q: 3, r: 0 }))).toBe(true);
      expect(next.players.get('p1')!.explored.has(coordToKey({ q: 3, r: 0 }))).toBe(true);
    });
  });

  describe('unit visibility on START_TURN', () => {
    it('unit with default sight 2 reveals a 2-radius area', () => {
      // Use (3,3) — all ring-1 and ring-2 neighbours exist in the 10x10 map
      const units = new Map([
        ['u1', createTestUnit({ id: 'u1', owner: 'p1', position: { q: 3, r: 3 }, typeId: 'warrior' })],
      ]);
      const state = createTestState({ units });
      const next = visibilitySystem(state, { type: 'START_TURN' });

      const visibility = next.players.get('p1')!.visibility;
      // Center tile
      expect(visibility.has(coordToKey({ q: 3, r: 3 }))).toBe(true);
      // Ring-1 neighbours
      expect(visibility.has(coordToKey({ q: 4, r: 3 }))).toBe(true);
      expect(visibility.has(coordToKey({ q: 2, r: 3 }))).toBe(true);
      expect(visibility.has(coordToKey({ q: 3, r: 4 }))).toBe(true);
      expect(visibility.has(coordToKey({ q: 3, r: 2 }))).toBe(true);
      expect(visibility.has(coordToKey({ q: 4, r: 2 }))).toBe(true);
      expect(visibility.has(coordToKey({ q: 2, r: 4 }))).toBe(true);
      // A ring-2 tile
      expect(visibility.has(coordToKey({ q: 5, r: 3 }))).toBe(true);
      // A ring-3 tile should NOT be visible
      expect(visibility.has(coordToKey({ q: 6, r: 3 }))).toBe(false);
    });

    it('visibility is limited to tiles that exist on the map', () => {
      // Place a unit near the edge of the 10x10 map
      const units = new Map([
        ['u1', createTestUnit({ id: 'u1', owner: 'p1', position: { q: 0, r: 0 }, typeId: 'warrior' })],
      ]);
      const state = createTestState({ units });
      const next = visibilitySystem(state, { type: 'START_TURN' });

      const visibility = next.players.get('p1')!.visibility;
      // A key that falls off the map should NOT be included
      const offMapKey = coordToKey({ q: -5, r: -5 });
      expect(visibility.has(offMapKey)).toBe(false);
    });

    it('unit with custom sightRange 3 reveals a 3-radius area', () => {
      // Use (3,3) — all ring-3 neighbours exist in the 10x10 map
      const units = new Map([
        ['scout', createTestUnit({ id: 'scout', owner: 'p1', position: { q: 3, r: 3 }, typeId: 'scout' })],
      ]);
      // Override config to register 'scout' with sightRange 3
      const baseConfig = createTestState().config;
      const customUnits = new Map(baseConfig.units);
      customUnits.set('scout', {
        ...customUnits.get('warrior')!,
        id: 'scout',
        sightRange: 3,
      });
      const config = { ...baseConfig, units: customUnits };
      const state = createTestState({ units, config });
      const next = visibilitySystem(state, { type: 'START_TURN' });

      const visibility = next.players.get('p1')!.visibility;
      // Ring-3 tiles from (3,3) that are confirmed to be on the map
      expect(visibility.has(coordToKey({ q: 6, r: 3 }))).toBe(true); // q+3
      expect(visibility.has(coordToKey({ q: 3, r: 6 }))).toBe(true); // r+3
      expect(visibility.has(coordToKey({ q: 0, r: 3 }))).toBe(true); // q-3
    });

    it('unknown unit typeId falls back to default sight range of 2', () => {
      const units = new Map([
        ['u1', createTestUnit({ id: 'u1', owner: 'p1', position: { q: 3, r: 3 }, typeId: 'unknown_unit_type' })],
      ]);
      const state = createTestState({ units });
      const next = visibilitySystem(state, { type: 'START_TURN' });

      const visibility = next.players.get('p1')!.visibility;
      // Center visible
      expect(visibility.has(coordToKey({ q: 3, r: 3 }))).toBe(true);
      // Ring 2 visible (default fallback)
      expect(visibility.has(coordToKey({ q: 5, r: 3 }))).toBe(true);
      // Ring 3 NOT visible (only radius 2 applied)
      expect(visibility.has(coordToKey({ q: 6, r: 3 }))).toBe(false);
    });

    it('only reveals tiles for the current player\'s units', () => {
      const players = new Map([
        ['p1', createTestPlayer({ id: 'p1' })],
        ['p2', createTestPlayer({ id: 'p2' })],
      ]);
      const units = new Map([
        ['u1', createTestUnit({ id: 'u1', owner: 'p1', position: { q: 0, r: 0 } })],
        ['u2', createTestUnit({ id: 'u2', owner: 'p2', position: { q: 9, r: 0 } })],
      ]);
      const state = createTestState({ players, units, currentPlayerId: 'p1' });
      const next = visibilitySystem(state, { type: 'START_TURN' });

      const p1Visibility = next.players.get('p1')!.visibility;
      const p2Visibility = next.players.get('p2')!.visibility;

      // p1 sees around (0,0), not (9,0)
      expect(p1Visibility.has(coordToKey({ q: 0, r: 0 }))).toBe(true);
      expect(p1Visibility.has(coordToKey({ q: 9, r: 0 }))).toBe(false);

      // p2's visibility is untouched on p1's turn
      expect(p2Visibility.size).toBe(0);
    });

    it('multiple units merge their visibility areas', () => {
      const units = new Map([
        ['u1', createTestUnit({ id: 'u1', owner: 'p1', position: { q: 0, r: 0 } })],
        ['u2', createTestUnit({ id: 'u2', owner: 'p1', position: { q: 5, r: 5 } })],
      ]);
      const state = createTestState({ units });
      const next = visibilitySystem(state, { type: 'START_TURN' });

      const visibility = next.players.get('p1')!.visibility;
      // Both areas covered
      expect(visibility.has(coordToKey({ q: 0, r: 0 }))).toBe(true);
      expect(visibility.has(coordToKey({ q: 5, r: 5 }))).toBe(true);
      // Neither unit can see the other's distant tiles individually
      expect(visibility.has(coordToKey({ q: 2, r: 2 }))).toBe(false);
    });
  });

  describe('city visibility on START_TURN', () => {
    it('city reveals a 3-radius area around its position', () => {
      // Use (3,3) — all ring-3 neighbours exist in the 10x10 map
      const city = createTestCity({ id: 'city1', owner: 'p1', position: { q: 3, r: 3 } });
      const state = createTestState({ cities: new Map([['city1', city]]) });
      const next = visibilitySystem(state, { type: 'START_TURN' });

      const visibility = next.players.get('p1')!.visibility;
      // Center
      expect(visibility.has(coordToKey({ q: 3, r: 3 }))).toBe(true);
      // Ring 1
      expect(visibility.has(coordToKey({ q: 4, r: 3 }))).toBe(true);
      // Ring 2
      expect(visibility.has(coordToKey({ q: 5, r: 3 }))).toBe(true);
      // Ring 3
      expect(visibility.has(coordToKey({ q: 6, r: 3 }))).toBe(true);
      expect(visibility.has(coordToKey({ q: 3, r: 6 }))).toBe(true);
      expect(visibility.has(coordToKey({ q: 0, r: 3 }))).toBe(true);
      // Ring 4 NOT visible (confirmed off-map for (3,3))
      expect(visibility.has(coordToKey({ q: 7, r: 3 }))).toBe(false);
    });

    it('city only reveals tiles that exist on the map', () => {
      // Place city at edge — some ring-3 tiles will be off the map
      const city = createTestCity({ id: 'city1', owner: 'p1', position: { q: 0, r: 0 } });
      const state = createTestState({ cities: new Map([['city1', city]]) });
      const next = visibilitySystem(state, { type: 'START_TURN' });

      const visibility = next.players.get('p1')!.visibility;
      // Off-map tile should not appear
      expect(visibility.has(coordToKey({ q: -3, r: 0 }))).toBe(false);
    });

    it('enemy city does not provide visibility to current player', () => {
      const players = new Map([
        ['p1', createTestPlayer({ id: 'p1' })],
        ['p2', createTestPlayer({ id: 'p2' })],
      ]);
      const enemyCity = createTestCity({ id: 'city2', owner: 'p2', position: { q: 5, r: 5 } });
      const state = createTestState({
        players,
        cities: new Map([['city2', enemyCity]]),
        currentPlayerId: 'p1',
      });
      const next = visibilitySystem(state, { type: 'START_TURN' });

      const p1Visibility = next.players.get('p1')!.visibility;
      // Enemy city should not provide visibility to p1
      expect(p1Visibility.has(coordToKey({ q: 5, r: 5 }))).toBe(false);
    });
  });

  describe('explored (fog of war) accumulation', () => {
    it('previously visible tiles become explored after moving away', () => {
      const players = new Map([
        ['p1', createTestPlayer({
          id: 'p1',
          visibility: new Set([coordToKey({ q: 3, r: 3 }), coordToKey({ q: 4, r: 3 })]),
          explored: new Set(),
        })],
      ]);
      // Unit is now elsewhere — old tiles won't be re-visible
      const units = new Map([
        ['u1', createTestUnit({ id: 'u1', owner: 'p1', position: { q: 0, r: 0 } })],
      ]);
      const state = createTestState({ players, units });
      const next = visibilitySystem(state, { type: 'START_TURN' });

      const explored = next.players.get('p1')!.explored;
      // Old visible tiles are now explored
      expect(explored.has(coordToKey({ q: 3, r: 3 }))).toBe(true);
      expect(explored.has(coordToKey({ q: 4, r: 3 }))).toBe(true);
    });

    it('tiles visible this turn are also added to explored', () => {
      const units = new Map([
        ['u1', createTestUnit({ id: 'u1', owner: 'p1', position: { q: 0, r: 0 } })],
      ]);
      const state = createTestState({ units });
      const next = visibilitySystem(state, { type: 'START_TURN' });

      const explored = next.players.get('p1')!.explored;
      const visibility = next.players.get('p1')!.visibility;

      // Every currently visible tile should also be explored
      for (const key of visibility) {
        expect(explored.has(key)).toBe(true);
      }
    });

    it('explored tiles persist across calls and accumulate', () => {
      const players = new Map([
        ['p1', createTestPlayer({
          id: 'p1',
          visibility: new Set([coordToKey({ q: 5, r: 5 })]),
          explored: new Set([coordToKey({ q: 9, r: 9 })]),
        })],
      ]);
      const units = new Map([
        ['u1', createTestUnit({ id: 'u1', owner: 'p1', position: { q: 0, r: 0 } })],
      ]);
      const state = createTestState({ players, units });
      const next = visibilitySystem(state, { type: 'START_TURN' });

      const explored = next.players.get('p1')!.explored;
      // Pre-existing explored tile survives
      expect(explored.has(coordToKey({ q: 9, r: 9 }))).toBe(true);
      // Previously visible tile is now also explored
      expect(explored.has(coordToKey({ q: 5, r: 5 }))).toBe(true);
      // Newly visible tiles are explored too
      expect(explored.has(coordToKey({ q: 0, r: 0 }))).toBe(true);
    });

    it('visibility is replaced each turn (not cumulative)', () => {
      const players = new Map([
        ['p1', createTestPlayer({
          id: 'p1',
          visibility: new Set([coordToKey({ q: 5, r: 5 }), coordToKey({ q: 6, r: 5 })]),
          explored: new Set(),
        })],
      ]);
      // Unit moved to (0,0) — old tiles at (5,5) should no longer be visible
      const units = new Map([
        ['u1', createTestUnit({ id: 'u1', owner: 'p1', position: { q: 0, r: 0 } })],
      ]);
      const state = createTestState({ players, units });
      const next = visibilitySystem(state, { type: 'START_TURN' });

      const visibility = next.players.get('p1')!.visibility;
      // Old position no longer visible (unit moved away)
      expect(visibility.has(coordToKey({ q: 5, r: 5 }))).toBe(false);
      // New position is visible
      expect(visibility.has(coordToKey({ q: 0, r: 0 }))).toBe(true);
    });
  });

  describe('combined unit + city visibility', () => {
    it('unit and city together cover their respective areas', () => {
      // Unit at (3,3), city at (7,3) — separated far enough that ring-2 from unit
      // and ring-3 from city don't overlap
      const city = createTestCity({ id: 'city1', owner: 'p1', position: { q: 7, r: 3 } });
      const units = new Map([
        ['u1', createTestUnit({ id: 'u1', owner: 'p1', position: { q: 3, r: 3 } })],
      ]);
      const state = createTestState({
        cities: new Map([['city1', city]]),
        units,
      });
      const next = visibilitySystem(state, { type: 'START_TURN' });

      const visibility = next.players.get('p1')!.visibility;
      // Unit's area (radius 2 from (3,3))
      expect(visibility.has(coordToKey({ q: 3, r: 3 }))).toBe(true);
      expect(visibility.has(coordToKey({ q: 5, r: 3 }))).toBe(true);
      // City's area (radius 3 from (7,3)): (8,0) is distance 3 and on the map
      expect(visibility.has(coordToKey({ q: 7, r: 3 }))).toBe(true);
      expect(visibility.has(coordToKey({ q: 8, r: 0 }))).toBe(true); // distance 3 from (7,3)
    });
  });

  describe('F-09: LOS occlusion by mountains and forest', () => {
    it('mountain feature blocks LOS to tiles behind it', () => {
      // Unit at (3,3), mountain at (4,3), target at (5,3) — all in a straight line
      // The mountain is an intermediate tile; target should be hidden.
      const units = new Map([
        ['u1', createTestUnit({ id: 'u1', owner: 'p1', position: { q: 3, r: 3 }, typeId: 'warrior' })],
      ]);
      const state = createTestState({ units });
      const tiles = new Map(state.map.tiles);
      // Set mountains on the intermediate tile (4,3)
      const midTile = tiles.get(coordToKey({ q: 4, r: 3 }))!;
      tiles.set(coordToKey({ q: 4, r: 3 }), { ...midTile, feature: 'mountains' });
      const testState = { ...state, map: { ...state.map, tiles } };
      const next = visibilitySystem(testState, { type: 'START_TURN' });

      const visibility = next.players.get('p1')!.visibility;
      // (4,3) with mountains is visible (observer can see the mountain itself)
      expect(visibility.has(coordToKey({ q: 4, r: 3 }))).toBe(true);
      // (5,3) behind the mountain is NOT visible (LOS blocked)
      expect(visibility.has(coordToKey({ q: 5, r: 3 }))).toBe(false);
    });

    it('forest feature blocks LOS to tiles behind it', () => {
      const units = new Map([
        ['u1', createTestUnit({ id: 'u1', owner: 'p1', position: { q: 3, r: 3 }, typeId: 'warrior' })],
      ]);
      const state = createTestState({ units });
      const tiles = new Map(state.map.tiles);
      const midTile = tiles.get(coordToKey({ q: 4, r: 3 }))!;
      tiles.set(coordToKey({ q: 4, r: 3 }), { ...midTile, feature: 'forest' });
      const testState = { ...state, map: { ...state.map, tiles } };
      const next = visibilitySystem(testState, { type: 'START_TURN' });

      const visibility = next.players.get('p1')!.visibility;
      // The forest tile itself is visible
      expect(visibility.has(coordToKey({ q: 4, r: 3 }))).toBe(true);
      // (5,3) behind the forest is NOT visible
      expect(visibility.has(coordToKey({ q: 5, r: 3 }))).toBe(false);
    });

    it('tiles adjacent to the observer are always visible regardless of blocking terrain', () => {
      // Adjacent tiles (distance 1) have no intermediate tiles — always visible
      const units = new Map([
        ['u1', createTestUnit({ id: 'u1', owner: 'p1', position: { q: 3, r: 3 }, typeId: 'warrior' })],
      ]);
      const state = createTestState({ units });
      const tiles = new Map(state.map.tiles);
      // Put mountains directly adjacent to the observer
      const adjTile = tiles.get(coordToKey({ q: 4, r: 3 }))!;
      tiles.set(coordToKey({ q: 4, r: 3 }), { ...adjTile, feature: 'mountains' });
      const testState = { ...state, map: { ...state.map, tiles } };
      const next = visibilitySystem(testState, { type: 'START_TURN' });

      const visibility = next.players.get('p1')!.visibility;
      // The adjacent mountain tile is directly visible (no intermediates)
      expect(visibility.has(coordToKey({ q: 4, r: 3 }))).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('no units and no cities results in empty visibility', () => {
      const state = createTestState({ units: new Map(), cities: new Map() });
      const next = visibilitySystem(state, { type: 'START_TURN' });

      const visibility = next.players.get('p1')!.visibility;
      expect(visibility.size).toBe(0);
    });

    it('returns state unchanged when current player not found', () => {
      const state = createTestState({ currentPlayerId: 'nonexistent' });
      const next = visibilitySystem(state, { type: 'START_TURN' });
      expect(next).toBe(state);
    });

    it('does not mutate the original state', () => {
      const units = new Map([
        ['u1', createTestUnit({ id: 'u1', owner: 'p1', position: { q: 0, r: 0 } })],
      ]);
      const state = createTestState({ units });
      const originalVisibilitySize = state.players.get('p1')!.visibility.size;

      visibilitySystem(state, { type: 'START_TURN' });

      // Original state's player visibility is unchanged
      expect(state.players.get('p1')!.visibility.size).toBe(originalVisibilitySize);
    });

    it('produces deterministic results for the same state', () => {
      const units = new Map([
        ['u1', createTestUnit({ id: 'u1', owner: 'p1', position: { q: 3, r: 3 } })],
      ]);
      const state = createTestState({ units });
      const next1 = visibilitySystem(state, { type: 'START_TURN' });
      const next2 = visibilitySystem(state, { type: 'START_TURN' });

      const vis1 = [...next1.players.get('p1')!.visibility].sort();
      const vis2 = [...next2.players.get('p1')!.visibility].sort();
      expect(vis1).toEqual(vis2);
    });
  });

  describe('BB3.1: Distant Lands visibility gate — parity across all action branches', () => {
    /**
     * Helper: build a test state where tile (5,3) is marked isDistantLands=true.
     * Player p1 does NOT have distantLandsReachable set.
     * Unit u1 is at (3,3) with default sight range 2 — (5,3) is at distance 2.
     */
    function buildDistantLandsState() {
      const units = new Map([
        ['u1', createTestUnit({ id: 'u1', owner: 'p1', position: { q: 3, r: 3 }, typeId: 'warrior' })],
      ]);
      const baseState = createTestState({ units });
      const tiles = new Map(baseState.map.tiles);
      const distantKey = coordToKey({ q: 5, r: 3 });
      const distantTile = tiles.get(distantKey)!;
      tiles.set(distantKey, { ...distantTile, isDistantLands: true });
      return { ...baseState, map: { ...baseState.map, tiles } };
    }

    it('START_TURN: Distant Lands tile is hidden when player lacks distantLandsReachable', () => {
      const state = buildDistantLandsState();
      const next = visibilitySystem(state, { type: 'START_TURN' });
      const visibility = next.players.get('p1')!.visibility;
      // (5,3) is in range-2 of unit at (3,3) but is Distant Lands — must NOT be visible
      expect(visibility.has(coordToKey({ q: 5, r: 3 }))).toBe(false);
      // Adjacent tile (4,3) is NOT Distant Lands — must be visible
      expect(visibility.has(coordToKey({ q: 4, r: 3 }))).toBe(true);
    });

    it('MOVE_UNIT: Distant Lands tile is hidden when player lacks distantLandsReachable', () => {
      const state = buildDistantLandsState();
      // Unit has already moved to (3,3) in state (position already updated by movementSystem)
      const next = visibilitySystem(state, {
        type: 'MOVE_UNIT',
        unitId: 'u1',
        path: [{ q: 3, r: 3 }],
      });
      const visibility = next.players.get('p1')!.visibility;
      // (5,3) is in sight range from (3,3) but Distant Lands — must NOT be revealed
      expect(visibility.has(coordToKey({ q: 5, r: 3 }))).toBe(false);
      // (4,3) is not Distant Lands — should be visible
      expect(visibility.has(coordToKey({ q: 4, r: 3 }))).toBe(true);
    });

    it('FOUND_CITY: Distant Lands tile is hidden when player lacks distantLandsReachable', () => {
      // Build state with a city at (3,3) — city sight radius 3 reaches (5,3) and (6,3)
      const baseState = buildDistantLandsState();
      const city: CityState = {
        id: 'city1',
        name: 'Rome',
        owner: 'p1',
        position: { q: 3, r: 3 },
        population: 1,
        food: 0,
        productionQueue: [],
        productionProgress: 0,
        buildings: [],
        territory: [coordToKey({ q: 3, r: 3 })],
        settlementType: 'city',
        happiness: 10,
        isCapital: true,
        defenseHP: 100,
        specialization: null,
        specialists: 0,
        districts: [],
      };
      const state = { ...baseState, cities: new Map([['city1', city]]) };
      const next = visibilitySystem(state, { type: 'FOUND_CITY', unitId: 'u1', name: 'Rome' });
      const visibility = next.players.get('p1')!.visibility;
      // (5,3) is in range-3 of city at (3,3) but Distant Lands — must NOT be visible
      expect(visibility.has(coordToKey({ q: 5, r: 3 }))).toBe(false);
      // (4,3) is not Distant Lands — should be visible
      expect(visibility.has(coordToKey({ q: 4, r: 3 }))).toBe(true);
    });

    it('ATTACK_UNIT: Distant Lands tile is hidden when player lacks distantLandsReachable', () => {
      const state = buildDistantLandsState();
      // Simulate attacker at (3,3) — unit position already in state
      const next = visibilitySystem(state, {
        type: 'ATTACK_UNIT',
        attackerId: 'u1',
        targetId: 'u2',
      });
      const visibility = next.players.get('p1')!.visibility;
      // (5,3) in sight range of attacker at (3,3) but Distant Lands — must NOT be revealed
      expect(visibility.has(coordToKey({ q: 5, r: 3 }))).toBe(false);
      // (4,3) is not Distant Lands — should be visible
      expect(visibility.has(coordToKey({ q: 4, r: 3 }))).toBe(true);
    });
  });
});
