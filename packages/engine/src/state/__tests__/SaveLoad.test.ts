import { describe, it, expect } from 'vitest';
import { serializeState, deserializeState } from '../SaveLoad';
import { createTestState, createTestPlayer, createTestUnit } from '../../systems/__tests__/helpers';
import { coordToKey } from '../../hex/HexMath';

describe('SaveLoad', () => {
  it('round-trips GameState through serialize/deserialize', () => {
    const state = createTestState({
      turn: 5,
      players: new Map([
        ['p1', createTestPlayer({
          id: 'p1', name: 'Test',
          researchedTechs: ['pottery', 'mining'],
          currentResearch: 'archery', researchProgress: 15, gold: 200,
        })],
      ]),
    });
    const json = serializeState(state);
    const restored = deserializeState(json);

    expect(restored.turn).toBe(5);
    expect(restored.currentPlayerId).toBe('p1');
    expect(restored.players.get('p1')!.gold).toBe(200);
    expect(restored.players.get('p1')!.researchedTechs).toEqual(['pottery', 'mining']);
  });

  it('preserves Maps', () => {
    const units = new Map([
      ['u1', createTestUnit({ id: 'u1', owner: 'p1' })],
    ]);
    const state = createTestState({ units });
    const json = serializeState(state);
    const restored = deserializeState(json);

    expect(restored.players instanceof Map).toBe(true);
    expect(restored.units instanceof Map).toBe(true);
    expect(restored.map.tiles instanceof Map).toBe(true);
    expect(restored.diplomacy.relations instanceof Map).toBe(true);
  });

  it('preserves Sets', () => {
    const tileKey = coordToKey({ q: 0, r: 0 });
    const state = createTestState({
      players: new Map([
        ['p1', createTestPlayer({
          id: 'p1',
          visibility: new Set([tileKey, coordToKey({ q: 1, r: 0 })]),
          explored: new Set([tileKey, coordToKey({ q: 1, r: 0 }), coordToKey({ q: 2, r: 0 })]),
        })],
      ]),
    });
    const json = serializeState(state);
    const restored = deserializeState(json);

    const player = restored.players.get('p1')!;
    expect(player.visibility instanceof Set).toBe(true);
    expect(player.visibility.has(tileKey)).toBe(true);
    expect(player.explored.size).toBe(3);
  });

  it('preserves game log', () => {
    const state = createTestState({
      log: [{ turn: 1, playerId: 'p1', message: 'test', type: 'production' as const }],
    });
    const json = serializeState(state);
    const restored = deserializeState(json);

    expect(restored.log).toHaveLength(1);
    expect(restored.log[0].message).toBe('test');
  });

  it('produces valid JSON string', () => {
    const state = createTestState();
    const json = serializeState(state);
    expect(() => JSON.parse(json)).not.toThrow();
  });
});
