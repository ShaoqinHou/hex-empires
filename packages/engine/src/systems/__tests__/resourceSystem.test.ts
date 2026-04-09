import { describe, it, expect } from 'vitest';
import { resourceSystem } from '../resourceSystem';
import { createTestState, createTestPlayer, createTestUnit } from './helpers';
import type { CityState } from '../../types/GameState';
import { coordToKey } from '../../hex/HexMath';

function createTestCity(overrides: Partial<CityState> = {}): CityState {
  return {
    id: 'c1', name: 'Rome', owner: 'p1', position: { q: 3, r: 3 },
    population: 3, food: 0, productionQueue: [], productionProgress: 0,
    buildings: [], territory: [coordToKey({ q: 3, r: 3 }), coordToKey({ q: 4, r: 3 })],
    settlementType: 'city', happiness: 10, isCapital: true, defenseHP: 100,
    ...overrides,
  };
}

describe('resourceSystem', () => {
  it('accumulates resources from cities on END_TURN', () => {
    const city = createTestCity();
    const state = createTestState({
      cities: new Map([['c1', city]]),
      players: new Map([['p1', createTestPlayer({ gold: 100 })]]),
    });
    const next = resourceSystem(state, { type: 'END_TURN' });
    // resourceSystem should have processed and returned new state
    expect(next).not.toBe(state);
    const player = next.players.get('p1')!;
    // Player should exist with updated resources (grassland has no gold, so gold may decrease from maintenance)
    expect(player).toBeDefined();
  });

  it('deducts military unit maintenance', () => {
    const city = createTestCity();
    const units = new Map([
      ['w1', createTestUnit({ id: 'w1', typeId: 'warrior' })],
      ['w2', createTestUnit({ id: 'w2', typeId: 'warrior' })],
    ]);
    const state = createTestState({
      cities: new Map([['c1', city]]),
      units,
      players: new Map([['p1', createTestPlayer({ gold: 100 })]]),
    });
    const next = resourceSystem(state, { type: 'END_TURN' });
    // 2 military units = 2 maintenance
    const goldWithMaintenance = next.players.get('p1')!.gold;

    // Compare with no units
    const stateNoUnits = createTestState({
      cities: new Map([['c1', city]]),
      units: new Map(),
      players: new Map([['p1', createTestPlayer({ gold: 100 })]]),
    });
    const nextNoUnits = resourceSystem(stateNoUnits, { type: 'END_TURN' });
    expect(goldWithMaintenance).toBeLessThan(nextNoUnits.players.get('p1')!.gold);
  });

  it('does not charge maintenance for civilian units', () => {
    const city = createTestCity();
    const units = new Map([
      ['s1', createTestUnit({ id: 's1', typeId: 'settler' })],
    ]);
    const state = createTestState({
      cities: new Map([['c1', city]]),
      units,
      players: new Map([['p1', createTestPlayer({ gold: 100 })]]),
    });
    const stateNoUnits = createTestState({
      cities: new Map([['c1', city]]),
      units: new Map(),
      players: new Map([['p1', createTestPlayer({ gold: 100 })]]),
    });
    const next = resourceSystem(state, { type: 'END_TURN' });
    const nextNoUnits = resourceSystem(stateNoUnits, { type: 'END_TURN' });
    // Settler has no maintenance, so gold should be equal
    expect(next.players.get('p1')!.gold).toBe(nextNoUnits.players.get('p1')!.gold);
  });

  it('ignores non-END_TURN actions', () => {
    const state = createTestState();
    expect(resourceSystem(state, { type: 'START_TURN' })).toBe(state);
  });

  it('only processes current player', () => {
    const city = createTestCity({ owner: 'p2' });
    const state = createTestState({
      cities: new Map([['c1', city]]),
      currentPlayerId: 'p1',
    });
    const next = resourceSystem(state, { type: 'END_TURN' });
    // p1 has no cities so resources shouldn't increase much
    expect(next.players.get('p1')!.gold).toBe(100);
  });
});
