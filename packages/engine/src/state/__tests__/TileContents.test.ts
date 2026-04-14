import { describe, it, expect } from 'vitest';
import { getTileContents, getSelectionCycle, hasStackedEntities } from '../TileContents';
import { createTestState, createTestUnit, createTestPlayer } from '../../systems/__tests__/helpers';
import type { CityState } from '../../types/GameState';
import { coordToKey } from '../../hex/HexMath';

function createTestCity(overrides: Partial<CityState> = {}): CityState {
  return {
    id: 'c1',
    name: 'TestCity',
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

describe('getTileContents', () => {
  it('returns empty contents for an off-map hex', () => {
    const state = createTestState();
    const c = getTileContents(state, { q: 999, r: 999 }, 'p1');
    expect(c.tile).toBeNull();
    expect(c.ownUnits).toEqual([]);
    expect(c.enemyUnits).toEqual([]);
    expect(c.city).toBeNull();
    expect(c.district).toBeNull();
    expect(c.improvement).toBeNull();
  });

  it('returns the tile for a valid hex', () => {
    const state = createTestState();
    const c = getTileContents(state, { q: 5, r: 5 }, 'p1');
    expect(c.tile).not.toBeNull();
    expect(c.tile?.coord).toEqual({ q: 5, r: 5 });
  });

  it('finds own units on the tile', () => {
    const units = new Map([
      ['u1', createTestUnit({ id: 'u1', owner: 'p1', position: { q: 3, r: 3 }, typeId: 'warrior' })],
    ]);
    const state = createTestState({ units });
    const c = getTileContents(state, { q: 3, r: 3 }, 'p1');
    expect(c.ownUnits.length).toBe(1);
    expect(c.ownUnits[0].id).toBe('u1');
    expect(c.enemyUnits.length).toBe(0);
  });

  it('sorts own units with military before civilian', () => {
    const units = new Map([
      ['s1', createTestUnit({ id: 's1', owner: 'p1', position: { q: 3, r: 3 }, typeId: 'settler' })],
      ['w1', createTestUnit({ id: 'w1', owner: 'p1', position: { q: 3, r: 3 }, typeId: 'warrior' })],
      ['b1', createTestUnit({ id: 'b1', owner: 'p1', position: { q: 3, r: 3 }, typeId: 'builder' })],
    ]);
    const state = createTestState({ units });
    const c = getTileContents(state, { q: 3, r: 3 }, 'p1');
    expect(c.ownUnits.length).toBe(3);
    // Military (warrior) should be first
    expect(c.ownUnits[0].typeId).toBe('warrior');
    // Civilians (settler, builder) follow
    expect(c.ownUnits[1].typeId === 'settler' || c.ownUnits[1].typeId === 'builder').toBe(true);
    expect(c.ownUnits[2].typeId === 'settler' || c.ownUnits[2].typeId === 'builder').toBe(true);
  });

  it('separates own vs enemy units', () => {
    const players = new Map([
      ['p1', createTestPlayer({ id: 'p1', visibility: new Set([coordToKey({ q: 3, r: 3 })]) })],
      ['p2', createTestPlayer({ id: 'p2' })],
    ]);
    const units = new Map([
      ['u1', createTestUnit({ id: 'u1', owner: 'p1', position: { q: 3, r: 3 } })],
      ['u2', createTestUnit({ id: 'u2', owner: 'p2', position: { q: 3, r: 3 } })],
    ]);
    const state = createTestState({ units, players, currentPlayerId: 'p1' });
    const c = getTileContents(state, { q: 3, r: 3 }, 'p1');
    expect(c.ownUnits.length).toBe(1);
    expect(c.ownUnits[0].id).toBe('u1');
    expect(c.enemyUnits.length).toBe(1);
    expect(c.enemyUnits[0].id).toBe('u2');
  });

  it('hides enemy units when tile is not visible (fog of war)', () => {
    const players = new Map([
      ['p1', createTestPlayer({ id: 'p1', visibility: new Set() })], // no visibility
      ['p2', createTestPlayer({ id: 'p2' })],
    ]);
    const units = new Map([
      ['u2', createTestUnit({ id: 'u2', owner: 'p2', position: { q: 3, r: 3 } })],
    ]);
    const state = createTestState({ units, players, currentPlayerId: 'p1' });
    const c = getTileContents(state, { q: 3, r: 3 }, 'p1');
    expect(c.enemyUnits.length).toBe(0);
  });

  it('reveals enemy units when tile is visible', () => {
    const players = new Map([
      ['p1', createTestPlayer({ id: 'p1', visibility: new Set([coordToKey({ q: 3, r: 3 })]) })],
      ['p2', createTestPlayer({ id: 'p2' })],
    ]);
    const units = new Map([
      ['u2', createTestUnit({ id: 'u2', owner: 'p2', position: { q: 3, r: 3 } })],
    ]);
    const state = createTestState({ units, players, currentPlayerId: 'p1' });
    const c = getTileContents(state, { q: 3, r: 3 }, 'p1');
    expect(c.enemyUnits.length).toBe(1);
  });

  it('finds city on the tile', () => {
    const cities = new Map([
      ['c1', createTestCity({ id: 'c1', owner: 'p1', position: { q: 4, r: 4 } })],
    ]);
    const state = createTestState({ cities });
    const c = getTileContents(state, { q: 4, r: 4 }, 'p1');
    expect(c.city).not.toBeNull();
    expect(c.city!.id).toBe('c1');
  });

  it('returns city regardless of owner (caller checks ownership)', () => {
    const cities = new Map([
      ['c1', createTestCity({ id: 'c1', owner: 'p2', position: { q: 4, r: 4 } })],
    ]);
    const state = createTestState({ cities });
    const c = getTileContents(state, { q: 4, r: 4 }, 'p1');
    expect(c.city).not.toBeNull();
    expect(c.city!.owner).toBe('p2');
  });

  it('finds combined entities: city + own units + enemy unit', () => {
    const players = new Map([
      ['p1', createTestPlayer({ id: 'p1', visibility: new Set([coordToKey({ q: 2, r: 2 })]) })],
      ['p2', createTestPlayer({ id: 'p2' })],
    ]);
    const cities = new Map([
      ['c1', createTestCity({ id: 'c1', owner: 'p1', position: { q: 2, r: 2 } })],
    ]);
    const units = new Map([
      ['u1', createTestUnit({ id: 'u1', owner: 'p1', position: { q: 2, r: 2 }, typeId: 'warrior' })],
      ['u2', createTestUnit({ id: 'u2', owner: 'p2', position: { q: 2, r: 2 }, typeId: 'warrior' })],
    ]);
    const state = createTestState({ units, cities, players, currentPlayerId: 'p1' });
    const c = getTileContents(state, { q: 2, r: 2 }, 'p1');
    expect(c.city!.id).toBe('c1');
    expect(c.ownUnits.length).toBe(1);
    expect(c.enemyUnits.length).toBe(1);
  });
});

describe('getSelectionCycle', () => {
  it('returns empty cycle for an empty tile', () => {
    const state = createTestState();
    const c = getTileContents(state, { q: 5, r: 5 }, 'p1');
    expect(getSelectionCycle(c, 'p1')).toEqual([]);
  });

  it('cycle contains own units first, then own city', () => {
    const cities = new Map([
      ['c1', createTestCity({ id: 'c1', owner: 'p1', position: { q: 2, r: 2 } })],
    ]);
    const units = new Map([
      ['w1', createTestUnit({ id: 'w1', owner: 'p1', position: { q: 2, r: 2 }, typeId: 'warrior' })],
      ['s1', createTestUnit({ id: 's1', owner: 'p1', position: { q: 2, r: 2 }, typeId: 'settler' })],
    ]);
    const state = createTestState({ units, cities });
    const c = getTileContents(state, { q: 2, r: 2 }, 'p1');
    const cycle = getSelectionCycle(c, 'p1');
    expect(cycle.length).toBe(3);
    expect(cycle[0]).toEqual({ type: 'unit', id: 'w1' }); // military first
    expect(cycle[1]).toEqual({ type: 'unit', id: 's1' }); // civilian
    expect(cycle[2]).toEqual({ type: 'city', id: 'c1' }); // city last
  });

  it('excludes enemy city from cycle', () => {
    const cities = new Map([
      ['c1', createTestCity({ id: 'c1', owner: 'p2', position: { q: 2, r: 2 } })],
    ]);
    const state = createTestState({ cities });
    const c = getTileContents(state, { q: 2, r: 2 }, 'p1');
    expect(getSelectionCycle(c, 'p1')).toEqual([]);
  });
});

describe('hasStackedEntities', () => {
  it('returns false for 0 or 1 selectable entity', () => {
    const state1 = createTestState();
    const c1 = getTileContents(state1, { q: 5, r: 5 }, 'p1');
    expect(hasStackedEntities(c1, 'p1')).toBe(false);

    const units = new Map([
      ['u1', createTestUnit({ id: 'u1', owner: 'p1', position: { q: 3, r: 3 } })],
    ]);
    const state2 = createTestState({ units });
    const c2 = getTileContents(state2, { q: 3, r: 3 }, 'p1');
    expect(hasStackedEntities(c2, 'p1')).toBe(false);
  });

  it('returns true for 2+ selectable entities', () => {
    const units = new Map([
      ['u1', createTestUnit({ id: 'u1', owner: 'p1', position: { q: 3, r: 3 }, typeId: 'warrior' })],
      ['u2', createTestUnit({ id: 'u2', owner: 'p1', position: { q: 3, r: 3 }, typeId: 'settler' })],
    ]);
    const state = createTestState({ units });
    const c = getTileContents(state, { q: 3, r: 3 }, 'p1');
    expect(hasStackedEntities(c, 'p1')).toBe(true);
  });
});
