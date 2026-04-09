import { describe, it, expect } from 'vitest';
import { turnSystem } from '../turnSystem';
import { createTestState, createTestPlayer, createTestUnit } from './helpers';

describe('turnSystem', () => {
  describe('START_TURN', () => {
    it('transitions phase to actions', () => {
      const state = createTestState({ phase: 'start' });
      const next = turnSystem(state, { type: 'START_TURN' });
      expect(next.phase).toBe('actions');
    });

    it('refreshes movement points for current player units', () => {
      const units = new Map([
        ['u1', createTestUnit({ id: 'u1', owner: 'p1', movementLeft: 0, typeId: 'warrior' })],
        ['u2', createTestUnit({ id: 'u2', owner: 'p1', movementLeft: 0, typeId: 'scout' })],
      ]);
      const state = createTestState({ phase: 'start', units });
      const next = turnSystem(state, { type: 'START_TURN' });
      expect(next.units.get('u1')!.movementLeft).toBe(2); // warrior = 2
      expect(next.units.get('u2')!.movementLeft).toBe(3); // scout = 3
    });

    it('does not refresh movement for other player units', () => {
      const units = new Map([
        ['u1', createTestUnit({ id: 'u1', owner: 'p1', movementLeft: 0 })],
        ['u2', createTestUnit({ id: 'u2', owner: 'p2', movementLeft: 0 })],
      ]);
      const players = new Map([
        ['p1', createTestPlayer({ id: 'p1' })],
        ['p2', createTestPlayer({ id: 'p2' })],
      ]);
      const state = createTestState({ phase: 'start', units, players, currentPlayerId: 'p1' });
      const next = turnSystem(state, { type: 'START_TURN' });
      expect(next.units.get('u1')!.movementLeft).toBe(2);
      expect(next.units.get('u2')!.movementLeft).toBe(0); // not refreshed
    });

    it('adds a log entry', () => {
      const state = createTestState({ phase: 'start' });
      const next = turnSystem(state, { type: 'START_TURN' });
      expect(next.log.length).toBe(1);
      expect(next.log[0].message).toContain('Turn 1 started');
    });
  });

  describe('END_TURN', () => {
    it('advances to next turn when single player', () => {
      const state = createTestState({ phase: 'actions', turn: 1 });
      const next = turnSystem(state, { type: 'END_TURN' });
      expect(next.turn).toBe(2);
      expect(next.phase).toBe('start');
    });

    it('advances to next player in multiplayer', () => {
      const players = new Map([
        ['p1', createTestPlayer({ id: 'p1' })],
        ['p2', createTestPlayer({ id: 'p2' })],
      ]);
      const state = createTestState({ players, currentPlayerId: 'p1' });
      const next = turnSystem(state, { type: 'END_TURN' });
      expect(next.currentPlayerId).toBe('p2');
      expect(next.turn).toBe(1); // same turn
      expect(next.phase).toBe('start');
    });

    it('wraps back to first player and increments turn', () => {
      const players = new Map([
        ['p1', createTestPlayer({ id: 'p1' })],
        ['p2', createTestPlayer({ id: 'p2' })],
      ]);
      const state = createTestState({ players, currentPlayerId: 'p2', turn: 5 });
      const next = turnSystem(state, { type: 'END_TURN' });
      expect(next.currentPlayerId).toBe('p1');
      expect(next.turn).toBe(6);
    });
  });
});
