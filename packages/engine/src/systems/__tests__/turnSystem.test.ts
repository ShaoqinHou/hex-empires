import { describe, it, expect } from 'vitest';
import { turnSystem } from '../turnSystem';
import { createTestState, createTestPlayer, createTestUnit } from './helpers';
import type { CityState } from '../../types/GameState';
import { coordToKey } from '../../hex/HexMath';

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

  describe('healing', () => {
    function createTestCity(overrides: Partial<CityState> = {}): CityState {
      return {
        id: 'c1', name: 'Rome', owner: 'p1', position: { q: 3, r: 3 },
        population: 3, food: 0, productionQueue: [], productionProgress: 0,
        buildings: [], territory: [coordToKey({ q: 3, r: 3 }), coordToKey({ q: 4, r: 3 }), coordToKey({ q: 3, r: 4 })],
        settlementType: 'city', happiness: 10, isCapital: true,
        ...overrides,
      };
    }

    it('heals unit in a city by 20 HP', () => {
      const city = createTestCity({ position: { q: 3, r: 3 } });
      const units = new Map([
        ['u1', createTestUnit({ id: 'u1', owner: 'p1', position: { q: 3, r: 3 }, health: 50, movementLeft: 1 })],
      ]);
      const state = createTestState({ phase: 'start', units, cities: new Map([['c1', city]]) });
      const next = turnSystem(state, { type: 'START_TURN' });
      expect(next.units.get('u1')!.health).toBe(70);
    });

    it('heals unit in friendly territory by 15 HP', () => {
      const city = createTestCity({ position: { q: 3, r: 3 } });
      const units = new Map([
        ['u1', createTestUnit({ id: 'u1', owner: 'p1', position: { q: 4, r: 3 }, health: 60, movementLeft: 1 })],
      ]);
      const state = createTestState({ phase: 'start', units, cities: new Map([['c1', city]]) });
      const next = turnSystem(state, { type: 'START_TURN' });
      expect(next.units.get('u1')!.health).toBe(75);
    });

    it('heals unit in neutral territory by 5 HP', () => {
      const units = new Map([
        ['u1', createTestUnit({ id: 'u1', owner: 'p1', position: { q: 0, r: 0 }, health: 80, movementLeft: 1 })],
      ]);
      const state = createTestState({ phase: 'start', units });
      const next = turnSystem(state, { type: 'START_TURN' });
      expect(next.units.get('u1')!.health).toBe(85);
    });

    it('caps healing at 100 HP', () => {
      const city = createTestCity({ position: { q: 3, r: 3 } });
      const units = new Map([
        ['u1', createTestUnit({ id: 'u1', owner: 'p1', position: { q: 3, r: 3 }, health: 95, movementLeft: 1 })],
      ]);
      const state = createTestState({ phase: 'start', units, cities: new Map([['c1', city]]) });
      const next = turnSystem(state, { type: 'START_TURN' });
      expect(next.units.get('u1')!.health).toBe(100);
    });

    it('does not heal units already at 100 HP', () => {
      const units = new Map([
        ['u1', createTestUnit({ id: 'u1', owner: 'p1', position: { q: 0, r: 0 }, health: 100, movementLeft: 1 })],
      ]);
      const state = createTestState({ phase: 'start', units });
      const next = turnSystem(state, { type: 'START_TURN' });
      expect(next.units.get('u1')!.health).toBe(100);
    });

    it('does not heal exhausted units (movementLeft === 0)', () => {
      const units = new Map([
        ['u1', createTestUnit({ id: 'u1', owner: 'p1', position: { q: 0, r: 0 }, health: 50, movementLeft: 0 })],
      ]);
      const state = createTestState({ phase: 'start', units });
      const next = turnSystem(state, { type: 'START_TURN' });
      expect(next.units.get('u1')!.health).toBe(50);
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
