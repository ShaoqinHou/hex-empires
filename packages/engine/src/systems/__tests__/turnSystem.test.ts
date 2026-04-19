import { describe, it, expect } from 'vitest';
import { turnSystem } from '../turnSystem';
import { createTestState, createTestPlayer, createTestUnit } from './helpers';
import type { CityState, DiplomacyRelation, GameEvent } from '../../types/GameState';
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
      expect(next.units.get('u2')!.movementLeft).toBe(2); // scout = 2
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
      expect(next.log[0].message).toContain('Turn 1');
    });
  });

  describe('healing', () => {
    function createTestCity(overrides: Partial<CityState> = {}): CityState {
      return {
        id: 'c1', name: 'Rome', owner: 'p1', position: { q: 3, r: 3 },
        population: 3, food: 0, productionQueue: [], productionProgress: 0,
        buildings: [], territory: [coordToKey({ q: 3, r: 3 }), coordToKey({ q: 4, r: 3 }), coordToKey({ q: 3, r: 4 })],
        settlementType: 'city', happiness: 10, isCapital: true, defenseHP: 100,
        specialization: null, specialists: 0, districts: [],
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

    it('heals unit in neutral territory by 10 HP', () => {
      const units = new Map([
        ['u1', createTestUnit({ id: 'u1', owner: 'p1', position: { q: 0, r: 0 }, health: 80, movementLeft: 1 })],
      ]);
      const state = createTestState({ phase: 'start', units });
      const next = turnSystem(state, { type: 'START_TURN' });
      expect(next.units.get('u1')!.health).toBe(90);
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

  describe('B4: enemy territory healing (5 HP/turn)', () => {
    function createTestCity(overrides: Partial<CityState> = {}): CityState {
      return {
        id: 'ec1', name: 'Enemy City', owner: 'p2', position: { q: 10, r: 10 },
        population: 1, food: 0, productionQueue: [], productionProgress: 0,
        buildings: [], territory: [coordToKey({ q: 10, r: 10 }), coordToKey({ q: 0, r: 0 })],
        settlementType: 'city', happiness: 10, isCapital: true, defenseHP: 100,
        specialization: null, specialists: 0, districts: [],
        ...overrides,
      };
    }

    function makeWarRelation(): DiplomacyRelation {
      return {
        status: 'war',
        relationship: -50,
        warSupport: 0,
        turnsAtPeace: 0,
        turnsAtWar: 3,
        hasAlliance: false,
        hasFriendship: false,
        hasDenounced: false,
        warDeclarer: 'p1',
        isSurpriseWar: false,
        activeEndeavors: [],
        activeSanctions: [],
      };
    }

    it('heals unit in enemy territory at 5 HP/turn', () => {
      // Unit at (0,0) which is in enemy city's territory
      const enemyCity = createTestCity({
        territory: [coordToKey({ q: 10, r: 10 }), coordToKey({ q: 0, r: 0 })],
      });
      const units = new Map([
        ['u1', createTestUnit({ id: 'u1', owner: 'p1', position: { q: 0, r: 0 }, health: 60, movementLeft: 1 })],
      ]);
      const players = new Map([
        ['p1', createTestPlayer({ id: 'p1' })],
        ['p2', createTestPlayer({ id: 'p2' })],
      ]);
      const diplomacy = { relations: new Map([['p1:p2', makeWarRelation()]]) };
      const state = createTestState({
        phase: 'start', units,
        cities: new Map([['ec1', enemyCity]]),
        players,
        diplomacy,
        currentPlayerId: 'p1',
      });

      const next = turnSystem(state, { type: 'START_TURN' });
      // Should heal 5 HP (enemy territory), not 10 (neutral)
      expect(next.units.get('u1')!.health).toBe(65);
    });

    it('heals unit in neutral territory at 10 HP/turn when not at war', () => {
      // No cities, no war = neutral territory
      const units = new Map([
        ['u1', createTestUnit({ id: 'u1', owner: 'p1', position: { q: 0, r: 0 }, health: 60, movementLeft: 1 })],
      ]);
      const state = createTestState({ phase: 'start', units, currentPlayerId: 'p1' });
      const next = turnSystem(state, { type: 'START_TURN' });
      expect(next.units.get('u1')!.health).toBe(70); // 10 HP neutral
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

describe('turnSystem — DISMISS_EVENT', () => {
  it('sets dismissed=true on a matching log event', () => {
    const event: GameEvent = {
      turn: 5,
      playerId: 'p1',
      message: 'Enemy warrior is 1 tile from your capital Rome!',
      type: 'combat',
      severity: 'critical',
      blocksTurn: true,
    };
    const state = createTestState({
      turn: 5,
      phase: 'actions',
      log: [event],
    });
    const next = turnSystem(state, { type: 'DISMISS_EVENT', eventMessage: event.message, eventTurn: event.turn });

    expect(next.log[0].dismissed).toBe(true);
  });

  it('returns state unchanged if the event cannot be found', () => {
    const event: GameEvent = {
      turn: 5,
      playerId: 'p1',
      message: 'Some known message',
      type: 'combat',
    };
    const state = createTestState({ turn: 5, phase: 'actions', log: [event] });
    const next = turnSystem(state, { type: 'DISMISS_EVENT', eventMessage: 'No such message', eventTurn: 5 });

    // same reference because nothing changed
    expect(next).toBe(state);
  });
});

describe('turnSystem — END_TURN blocksTurn guard', () => {
  it('blocks END_TURN for a human player when a blocksTurn critical event is undismissed', () => {
    const criticalEvent: GameEvent = {
      turn: 5,
      playerId: 'p1',
      message: 'Crisis event: Plague',
      type: 'crisis',
      severity: 'critical',
      blocksTurn: true,
    };
    const state = createTestState({
      turn: 5,
      phase: 'actions',
      players: new Map([['p1', createTestPlayer({ id: 'p1', isHuman: true })]]),
      log: [criticalEvent],
    });
    const next = turnSystem(state, { type: 'END_TURN' });

    // Phase must NOT advance
    expect(next.phase).toBe('actions');
    expect(next.lastValidation).not.toBeNull();
    expect(next.lastValidation?.valid).toBe(false);
  });

  it('allows END_TURN once the critical event is dismissed', () => {
    const criticalEvent: GameEvent = {
      turn: 5,
      playerId: 'p1',
      message: 'Crisis event: Plague',
      type: 'crisis',
      severity: 'critical',
      blocksTurn: true,
      dismissed: true,
    };
    const state = createTestState({
      turn: 5,
      phase: 'actions',
      players: new Map([['p1', createTestPlayer({ id: 'p1', isHuman: true })]]),
      log: [criticalEvent],
    });
    const next = turnSystem(state, { type: 'END_TURN' });

    expect(next.phase).toBe('start');
  });

  it('allows END_TURN when there are no blocksTurn events', () => {
    const infoEvent: GameEvent = {
      turn: 5,
      playerId: 'p1',
      message: 'Researched bronze_working!',
      type: 'research',
      severity: 'warning',
    };
    const state = createTestState({
      turn: 5,
      phase: 'actions',
      players: new Map([['p1', createTestPlayer({ id: 'p1', isHuman: true })]]),
      log: [infoEvent],
    });
    const next = turnSystem(state, { type: 'END_TURN' });

    expect(next.phase).toBe('start');
  });

  describe('END_TURN crisis policy gate (W2-05 F-03)', () => {
    it('blocks END_TURN when crisis policy slots are unfilled', () => {
      const player = createTestPlayer({
        id: 'p1',
        isHuman: true,
        crisisPhase: 'stage1',
        crisisPolicySlots: 2,
        crisisPolicies: ['one'], // only 1 of 2 filled
      });
      const state = createTestState({
        players: new Map([['p1', player]]),
      });
      const next = turnSystem(state, { type: 'END_TURN' });
      expect(next.lastValidation).not.toBeNull();
      expect(next.lastValidation!.valid).toBe(false);
      expect(next.lastValidation!.reason).toContain('crisis policy');
    });

    it('allows END_TURN when all crisis policy slots are filled', () => {
      const player = createTestPlayer({
        id: 'p1',
        isHuman: true,
        crisisPhase: 'stage1',
        crisisPolicySlots: 2,
        crisisPolicies: ['one', 'two'], // exactly 2 of 2 filled
      });
      const state = createTestState({
        players: new Map([['p1', player]]),
      });
      const next = turnSystem(state, { type: 'END_TURN' });
      expect(next.phase).toBe('start');
    });

    it('allows END_TURN when crisisPhase is resolved (no gate)', () => {
      const player = createTestPlayer({
        id: 'p1',
        isHuman: true,
        crisisPhase: 'resolved',
        crisisPolicySlots: 4,
        crisisPolicies: [], // empty, but resolved
      });
      const state = createTestState({
        players: new Map([['p1', player]]),
      });
      const next = turnSystem(state, { type: 'END_TURN' });
      expect(next.phase).toBe('start');
    });

    it('allows END_TURN when crisisPhase is none', () => {
      const player = createTestPlayer({
        id: 'p1',
        isHuman: true,
        crisisPhase: 'none',
      });
      const state = createTestState({
        players: new Map([['p1', player]]),
      });
      const next = turnSystem(state, { type: 'END_TURN' });
      expect(next.phase).toBe('start');
    });

    it('AI player bypasses crisis gate even if slots unfilled', () => {
      const player = createTestPlayer({
        id: 'p1',
        isHuman: false,
        crisisPhase: 'stage2',
        crisisPolicySlots: 3,
        crisisPolicies: [], // unfilled but AI
      });
      const state = createTestState({
        players: new Map([['p1', player]]),
      });
      const next = turnSystem(state, { type: 'END_TURN' });
      expect(next.phase).toBe('start');
    });
  });
});
