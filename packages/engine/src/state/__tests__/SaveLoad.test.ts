import { describe, it, expect } from 'vitest';
import { serializeState, deserializeState } from '../SaveLoad';
import type { GameState } from '../../types/GameState';

function createMinimalState(): GameState {
  return {
    turn: 5,
    currentPlayerId: 'p1',
    phase: 'actions',
    players: new Map([['p1', {
      id: 'p1', name: 'Test', isHuman: true, civilizationId: 'rome', leaderId: 'augustus',
      age: 'antiquity' as const, researchedTechs: ['pottery', 'mining'],
      currentResearch: 'archery', researchProgress: 15, gold: 200,
      science: 50, culture: 30, faith: 10, influence: 5, ageProgress: 10,
      legacyBonuses: [], visibility: new Set(['0,0', '1,0']), explored: new Set(['0,0', '1,0', '2,0']),
    }]]),
    map: { width: 5, height: 5, tiles: new Map([['0,0', {
      coord: { q: 0, r: 0 }, terrain: 'grassland', feature: null,
      resource: null, river: [], elevation: 0.5, continent: 1,
    }]]), wrapX: false },
    units: new Map([['u1', {
      id: 'u1', typeId: 'warrior', owner: 'p1', position: { q: 0, r: 0 },
      movementLeft: 2, health: 100, experience: 5, promotions: [], fortified: false,
    }]]),
    cities: new Map(),
    diplomacy: { relations: new Map([['p1:p2', {
      status: 'neutral' as const, relationship: 0, warSupport: 0, turnsAtPeace: 3, turnsAtWar: 0,
      hasAlliance: false, hasFriendship: false, hasDenounced: false,
      warDeclarer: null, isSurpriseWar: false,
      activeEndeavors: [], activeSanctions: [],
    }]]) },
    age: { currentAge: 'antiquity', ageThresholds: { exploration: 50, modern: 100 } },
    crises: [],
    victory: { winner: null, winType: null, progress: new Map() },
    log: [{ turn: 1, playerId: 'p1', message: 'test', type: 'production' as const }],
    rng: { seed: 42, counter: 10 },
  };
}

describe('SaveLoad', () => {
  it('round-trips GameState through serialize/deserialize', () => {
    const state = createMinimalState();
    const json = serializeState(state);
    const restored = deserializeState(json);

    expect(restored.turn).toBe(5);
    expect(restored.currentPlayerId).toBe('p1');
    expect(restored.players.get('p1')!.gold).toBe(200);
    expect(restored.players.get('p1')!.researchedTechs).toEqual(['pottery', 'mining']);
  });

  it('preserves Maps', () => {
    const state = createMinimalState();
    const json = serializeState(state);
    const restored = deserializeState(json);

    expect(restored.players instanceof Map).toBe(true);
    expect(restored.units instanceof Map).toBe(true);
    expect(restored.map.tiles instanceof Map).toBe(true);
    expect(restored.diplomacy.relations instanceof Map).toBe(true);
  });

  it('preserves Sets', () => {
    const state = createMinimalState();
    const json = serializeState(state);
    const restored = deserializeState(json);

    const player = restored.players.get('p1')!;
    expect(player.visibility instanceof Set).toBe(true);
    expect(player.visibility.has('0,0')).toBe(true);
    expect(player.explored.size).toBe(3);
  });

  it('preserves game log', () => {
    const state = createMinimalState();
    const json = serializeState(state);
    const restored = deserializeState(json);

    expect(restored.log).toHaveLength(1);
    expect(restored.log[0].message).toBe('test');
  });

  it('produces valid JSON string', () => {
    const state = createMinimalState();
    const json = serializeState(state);
    expect(() => JSON.parse(json)).not.toThrow();
  });
});
