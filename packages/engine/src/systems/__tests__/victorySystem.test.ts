import { describe, it, expect } from 'vitest';
import { victorySystem } from '../victorySystem';
import { createTestState, createTestPlayer } from './helpers';
import type { CityState } from '../../types/GameState';
import { coordToKey } from '../../hex/HexMath';

function makeCity(id: string, owner: string): CityState {
  return {
    id, name: id, owner, position: { q: 0, r: 0 },
    population: 1, food: 0, productionQueue: [], productionProgress: 0,
    buildings: [], territory: [coordToKey({ q: 0, r: 0 })],
    housing: 5, amenities: 1,
  };
}

describe('victorySystem', () => {
  it('detects domination victory when opponent has no cities', () => {
    const players = new Map([
      ['p1', createTestPlayer({ id: 'p1' })],
      ['p2', createTestPlayer({ id: 'p2' })],
    ]);
    const cities = new Map([
      ['c1', makeCity('c1', 'p1')],
    ]);
    // p2 is last player, check at end of their turn
    const state = createTestState({ players, cities, currentPlayerId: 'p2' });
    const next = victorySystem(state, { type: 'END_TURN' });
    expect(next.victory.winner).toBe('p1');
    expect(next.victory.winType).toBe('domination');
  });

  it('does not trigger domination when opponent has cities', () => {
    const players = new Map([
      ['p1', createTestPlayer({ id: 'p1' })],
      ['p2', createTestPlayer({ id: 'p2' })],
    ]);
    const cities = new Map([
      ['c1', makeCity('c1', 'p1')],
      ['c2', { ...makeCity('c2', 'p2'), position: { q: 5, r: 5 } }],
    ]);
    const state = createTestState({ players, cities, currentPlayerId: 'p2' });
    const next = victorySystem(state, { type: 'END_TURN' });
    expect(next.victory.winner).toBeNull();
  });

  it('detects science victory when all modern techs researched', () => {
    const modernTechs = [
      'industrialization', 'scientific_theory', 'rifling',
      'steam_power', 'electricity', 'replaceable_parts',
      'flight', 'nuclear_fission', 'combined_arms', 'rocketry',
    ];
    const players = new Map([
      ['p1', createTestPlayer({ id: 'p1', researchedTechs: modernTechs })],
      ['p2', createTestPlayer({ id: 'p2' })],
    ]);
    const state = createTestState({ players, currentPlayerId: 'p2' });
    const next = victorySystem(state, { type: 'END_TURN' });
    expect(next.victory.winner).toBe('p1');
    expect(next.victory.winType).toBe('science');
  });

  it('detects culture victory when culture reaches threshold', () => {
    const players = new Map([
      ['p1', createTestPlayer({ id: 'p1', culture: 500 })],
      ['p2', createTestPlayer({ id: 'p2' })],
    ]);
    const state = createTestState({ players, currentPlayerId: 'p2' });
    const next = victorySystem(state, { type: 'END_TURN' });
    expect(next.victory.winner).toBe('p1');
    expect(next.victory.winType).toBe('culture');
  });

  it('tracks progress for all victory types', () => {
    const players = new Map([
      ['p1', createTestPlayer({ id: 'p1', culture: 100 })],
      ['p2', createTestPlayer({ id: 'p2' })],
    ]);
    const state = createTestState({ players, currentPlayerId: 'p2' });
    const next = victorySystem(state, { type: 'END_TURN' });
    const p1Progress = next.victory.progress.get('p1');
    expect(p1Progress).toBeDefined();
    expect(p1Progress!.length).toBe(5); // 5 victory types
  });

  it('ignores non-END_TURN actions', () => {
    const state = createTestState();
    expect(victorySystem(state, { type: 'START_TURN' })).toBe(state);
  });

  it('does not overwrite existing winner', () => {
    const state = createTestState({
      victory: { winner: 'p1', winType: 'domination', progress: new Map() },
      currentPlayerId: 'p1',
    });
    const next = victorySystem(state, { type: 'END_TURN' });
    expect(next.victory.winner).toBe('p1');
  });
});
