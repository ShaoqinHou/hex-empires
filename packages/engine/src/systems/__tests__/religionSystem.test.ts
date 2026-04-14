import { describe, it, expect } from 'vitest';
import { religionSystem, canAdoptPantheon } from '../religionSystem';
import type { ReligionAction } from '../../types/Religion';
import { createTestState, createTestPlayer } from './helpers';

describe('religionSystem', () => {
  describe('purity / pass-through', () => {
    it('returns the identical state reference for non-religion actions', () => {
      const state = createTestState();
      const next = religionSystem(state, { type: 'START_TURN' });
      expect(next).toBe(state);
    });

    it('returns identical state for END_TURN (another pass-through action)', () => {
      const state = createTestState();
      const next = religionSystem(state, { type: 'END_TURN' });
      expect(next).toBe(state);
    });

    it('is deterministic: same input yields equal output', () => {
      const state = createTestState({
        players: new Map([['p1', createTestPlayer({ id: 'p1', faith: 30 })]]),
      });
      const action: ReligionAction = {
        type: 'ADOPT_PANTHEON',
        playerId: 'p1',
        pantheonId: 'god_of_healing',
      };
      const a = religionSystem(state, action);
      const b = religionSystem(state, action);
      expect(a.players.get('p1')!.faith).toBe(b.players.get('p1')!.faith);
      expect(a.log.length).toBe(b.log.length);
    });

    it('passes through non-ADOPT_PANTHEON religion actions (e.g. FOUND_RELIGION)', () => {
      const state = createTestState();
      const action: ReligionAction = {
        type: 'FOUND_RELIGION',
        playerId: 'p1',
        cityId: 'c1',
        religionName: 'Zen',
        founderBelief: 'b1',
        followerBelief: 'b2',
      };
      const next = religionSystem(state, action);
      expect(next).toBe(state);
    });
  });

  describe('ADOPT_PANTHEON — valid', () => {
    it('deducts faithCost from the player when faith is sufficient', () => {
      const state = createTestState({
        players: new Map([['p1', createTestPlayer({ id: 'p1', faith: 40 })]]),
      });
      const next = religionSystem(state, {
        type: 'ADOPT_PANTHEON',
        playerId: 'p1',
        pantheonId: 'god_of_healing', // faithCost 25
      });
      expect(next.players.get('p1')!.faith).toBe(15);
    });

    it('appends a legacy-type log event describing the adoption', () => {
      const state = createTestState({
        players: new Map([['p1', createTestPlayer({ id: 'p1', name: 'Rome', faith: 100 })]]),
      });
      const next = religionSystem(state, {
        type: 'ADOPT_PANTHEON',
        playerId: 'p1',
        pantheonId: 'god_of_war',
      });
      expect(next.log.length).toBe(state.log.length + 1);
      const last = next.log[next.log.length - 1];
      expect(last.type).toBe('legacy');
      expect(last.playerId).toBe('p1');
      expect(last.message).toContain('God of War');
    });

    it('does not mutate the original state (immutability)', () => {
      const state = createTestState({
        players: new Map([['p1', createTestPlayer({ id: 'p1', faith: 50 })]]),
      });
      const frozenFaith = state.players.get('p1')!.faith;
      const frozenLogLen = state.log.length;
      religionSystem(state, {
        type: 'ADOPT_PANTHEON',
        playerId: 'p1',
        pantheonId: 'god_of_craftsmen',
      });
      expect(state.players.get('p1')!.faith).toBe(frozenFaith);
      expect(state.log.length).toBe(frozenLogLen);
    });

    it('leaves unrelated state fields (turn, phase, map) untouched', () => {
      const state = createTestState({
        turn: 7,
        players: new Map([['p1', createTestPlayer({ id: 'p1', faith: 60 })]]),
      });
      const next = religionSystem(state, {
        type: 'ADOPT_PANTHEON',
        playerId: 'p1',
        pantheonId: 'god_of_healing',
      });
      expect(next.turn).toBe(7);
      expect(next.phase).toBe(state.phase);
      expect(next.map).toBe(state.map);
    });
  });

  describe('ADOPT_PANTHEON — invalid (state unchanged)', () => {
    it('returns state unchanged when pantheonId is not in the catalog', () => {
      const state = createTestState({
        players: new Map([['p1', createTestPlayer({ id: 'p1', faith: 100 })]]),
      });
      const next = religionSystem(state, {
        type: 'ADOPT_PANTHEON',
        playerId: 'p1',
        pantheonId: 'does_not_exist',
      });
      expect(next).toBe(state);
      expect(next.players.get('p1')!.faith).toBe(100);
    });

    it('returns state unchanged when player has insufficient faith', () => {
      const state = createTestState({
        players: new Map([['p1', createTestPlayer({ id: 'p1', faith: 10 })]]),
      });
      const next = religionSystem(state, {
        type: 'ADOPT_PANTHEON',
        playerId: 'p1',
        pantheonId: 'god_of_healing', // cost 25 > 10
      });
      expect(next).toBe(state);
      expect(next.players.get('p1')!.faith).toBe(10);
    });

    it('returns state unchanged when the player id is unknown', () => {
      const state = createTestState();
      const next = religionSystem(state, {
        type: 'ADOPT_PANTHEON',
        playerId: 'ghost',
        pantheonId: 'god_of_healing',
      });
      expect(next).toBe(state);
    });
  });

  describe('canAdoptPantheon helper', () => {
    it('returns true for a known pantheon with enough faith', () => {
      const state = createTestState({
        players: new Map([['p1', createTestPlayer({ id: 'p1', faith: 25 })]]),
      });
      expect(canAdoptPantheon(state, 'p1', 'god_of_healing')).toBe(true);
    });

    it('returns false for insufficient faith', () => {
      const state = createTestState({
        players: new Map([['p1', createTestPlayer({ id: 'p1', faith: 24 })]]),
      });
      expect(canAdoptPantheon(state, 'p1', 'god_of_healing')).toBe(false);
    });

    it('returns false for an unknown pantheon id', () => {
      const state = createTestState({
        players: new Map([['p1', createTestPlayer({ id: 'p1', faith: 9999 })]]),
      });
      expect(canAdoptPantheon(state, 'p1', 'nonexistent_god')).toBe(false);
    });

    it('returns false for an unknown player id', () => {
      const state = createTestState();
      expect(canAdoptPantheon(state, 'missing', 'god_of_healing')).toBe(false);
    });
  });
});
