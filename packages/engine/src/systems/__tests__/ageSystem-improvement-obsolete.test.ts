import { describe, it, expect } from 'vitest';
import { ageSystem } from '../ageSystem';
import { createTestState, createTestPlayer, createTestCity } from './helpers';
import { coordToKey } from '../../hex/HexMath';

/**
 * II3.1 — ImprovementDef.ageless + age-transition obsoletion
 *
 * Verifies that on TRANSITION_AGE:
 *  - ageless: true improvements (e.g. farm) are preserved on tiles
 *  - ageless: false improvements (e.g. plantation) are removed from tiles
 *  - improvements with no ageless field (undefined) are preserved (safe default)
 */
describe('ageSystem — improvement obsolescence on TRANSITION_AGE', () => {
  const FARM_KEY = coordToKey({ q: 1, r: 0 });
  const PLANTATION_KEY = coordToKey({ q: 2, r: 0 });
  const MINE_KEY = coordToKey({ q: 3, r: 0 });

  function buildState() {
    const player = createTestPlayer({
      id: 'p1',
      age: 'antiquity',
      civilizationId: 'rome',
      ageProgress: 50,
    });

    const city = createTestCity({
      id: 'c1',
      owner: 'p1',
      territory: [FARM_KEY, PLANTATION_KEY, MINE_KEY],
    });

    const baseState = createTestState({
      players: new Map([['p1', player]]),
      cities: new Map([['c1', city]]),
      age: { currentAge: 'antiquity', ageThresholds: { exploration: 50, modern: 100 } },
    });

    // Place improvements on tiles
    const nextTiles = new Map(baseState.map.tiles);
    const farmTile = nextTiles.get(FARM_KEY)!;
    nextTiles.set(FARM_KEY, { ...farmTile, improvement: 'farm' });

    const plantationTile = nextTiles.get(PLANTATION_KEY)!;
    nextTiles.set(PLANTATION_KEY, { ...plantationTile, improvement: 'plantation' });

    const mineTile = nextTiles.get(MINE_KEY)!;
    nextTiles.set(MINE_KEY, { ...mineTile, improvement: 'mine' });

    return {
      ...baseState,
      map: { ...baseState.map, tiles: nextTiles },
    };
  }

  it('preserves ageless: true improvement (farm) after age transition', () => {
    const state = buildState();
    const next = ageSystem(state, { type: 'TRANSITION_AGE', newCivId: 'spain' });

    const farmTile = next.map.tiles.get(FARM_KEY)!;
    expect(farmTile.improvement).toBe('farm');
  });

  it('removes ageless: false improvement (plantation) after age transition', () => {
    const state = buildState();
    const next = ageSystem(state, { type: 'TRANSITION_AGE', newCivId: 'spain' });

    const plantationTile = next.map.tiles.get(PLANTATION_KEY)!;
    expect(plantationTile.improvement).toBeNull();
  });

  it('preserves ageless: true improvement (mine) after age transition', () => {
    const state = buildState();
    const next = ageSystem(state, { type: 'TRANSITION_AGE', newCivId: 'spain' });

    const mineTile = next.map.tiles.get(MINE_KEY)!;
    expect(mineTile.improvement).toBe('mine');
  });

  it('adds a log entry when era-dependent improvements are removed', () => {
    const state = buildState();
    const next = ageSystem(state, { type: 'TRANSITION_AGE', newCivId: 'spain' });

    const logEntry = next.log.find(e =>
      e.message?.includes('Era-dependent improvements removed'),
    );
    expect(logEntry?.type).toBe('age');
  });

  it('does not modify map when no non-ageless improvements are present', () => {
    const player = createTestPlayer({
      id: 'p1',
      age: 'antiquity',
      civilizationId: 'rome',
      ageProgress: 50,
    });

    const farmOnlyKey = coordToKey({ q: 5, r: 0 });
    const city = createTestCity({
      id: 'c1',
      owner: 'p1',
      territory: [farmOnlyKey],
    });

    const baseState = createTestState({
      players: new Map([['p1', player]]),
      cities: new Map([['c1', city]]),
      age: { currentAge: 'antiquity', ageThresholds: { exploration: 50, modern: 100 } },
    });

    const nextTiles = new Map(baseState.map.tiles);
    const tile = nextTiles.get(farmOnlyKey)!;
    nextTiles.set(farmOnlyKey, { ...tile, improvement: 'farm' });
    const state = { ...baseState, map: { ...baseState.map, tiles: nextTiles } };

    const next = ageSystem(state, { type: 'TRANSITION_AGE', newCivId: 'spain' });

    const farmTile = next.map.tiles.get(farmOnlyKey)!;
    expect(farmTile.improvement).toBe('farm');
    // No improvement-removal log entry
    expect(
      next.log.find(e => e.message?.includes('Era-dependent improvements removed')),
    ).toBeUndefined();
  });

  it('only removes improvements from tiles in territory of transitioning player', () => {
    // Setup two players; p2 has a plantation but is NOT transitioning
    const player1 = createTestPlayer({
      id: 'p1',
      age: 'antiquity',
      civilizationId: 'rome',
      ageProgress: 50,
    });
    const player2 = createTestPlayer({
      id: 'p2',
      age: 'antiquity',
      civilizationId: 'china',
      ageProgress: 0,
    });

    const p1CityKey = coordToKey({ q: 1, r: 0 });
    const p2CityKey = coordToKey({ q: 8, r: 0 });

    const city1 = createTestCity({ id: 'c1', owner: 'p1', territory: [p1CityKey] });
    const city2 = createTestCity({ id: 'c2', owner: 'p2', territory: [p2CityKey] });

    const baseState = createTestState({
      currentPlayerId: 'p1',
      players: new Map([
        ['p1', player1],
        ['p2', player2],
      ]),
      cities: new Map([
        ['c1', city1],
        ['c2', city2],
      ]),
      age: { currentAge: 'antiquity', ageThresholds: { exploration: 50, modern: 100 } },
    });

    const nextTiles = new Map(baseState.map.tiles);
    const p1Tile = nextTiles.get(p1CityKey)!;
    nextTiles.set(p1CityKey, { ...p1Tile, improvement: 'plantation' });
    const p2Tile = nextTiles.get(p2CityKey)!;
    nextTiles.set(p2CityKey, { ...p2Tile, improvement: 'plantation' });

    const state = { ...baseState, map: { ...baseState.map, tiles: nextTiles } };

    const next = ageSystem(state, { type: 'TRANSITION_AGE', newCivId: 'spain' });

    // p1's tile: plantation removed (transitioning player)
    expect(next.map.tiles.get(p1CityKey)!.improvement).toBeNull();
    // p2's tile: plantation preserved (not transitioning)
    expect(next.map.tiles.get(p2CityKey)!.improvement).toBe('plantation');
  });
});
