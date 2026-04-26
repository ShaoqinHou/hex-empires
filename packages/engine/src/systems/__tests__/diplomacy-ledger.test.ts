import { describe, it, expect } from 'vitest';
import { diplomacySystem, updateDiplomacyCounters, defaultRelation } from '../diplomacySystem';
import { createTestState, createTestPlayer } from './helpers';
import type { DiplomacyRelation } from '../../types/GameState';

/** Helper: two-player state with ample Influence */
function twoPlayerState(turn = 1) {
  return createTestState({
    turn,
    players: new Map([
      ['p1', createTestPlayer({ id: 'p1', influence: 500 })],
      ['p2', createTestPlayer({ id: 'p2', influence: 500 })],
    ]),
    currentPlayerId: 'p1',
  });
}

/** Helper: state with a preset relation */
function stateWithRelation(overrides: Partial<DiplomacyRelation>, turn = 1) {
  const relation: DiplomacyRelation = { ...defaultRelation(), ...overrides };
  return createTestState({
    turn,
    players: new Map([
      ['p1', createTestPlayer({ id: 'p1', influence: 500 })],
      ['p2', createTestPlayer({ id: 'p2', influence: 500 })],
    ]),
    currentPlayerId: 'p1',
    diplomacy: { relations: new Map([['p1:p2', relation]]) },
  });
}

describe('Diplomatic Ledger (F-11)', () => {
  describe('DECLARE_WAR appends a ledger entry', () => {
    it('surprise war appends ledger entry with value -40 and correct id/reason', () => {
      const state = twoPlayerState(5);
      const next = diplomacySystem(state, {
        type: 'PROPOSE_DIPLOMACY',
        targetId: 'p2',
        proposal: { type: 'DECLARE_WAR', warType: 'surprise' },
      });

      const rel = next.diplomacy.relations.get('p1:p2')!;
      expect(rel.ledger).toBeDefined();
      expect(rel.ledger!.length).toBe(1);

      const entry = rel.ledger![0];
      expect(entry.id).toBe('surprise_war');
      expect(entry.value).toBe(-40);
      expect(entry.turnApplied).toBe(5);
      expect(entry.turnExpires).toBeUndefined();
      expect(entry.reason).toBe('Declared surprise war on us');
    });

    it('formal war appends ledger entry with value -40 and id "declared_war"', () => {
      const state = stateWithRelation({ relationship: -70, status: 'hostile' }, 3);
      const next = diplomacySystem(state, {
        type: 'PROPOSE_DIPLOMACY',
        targetId: 'p2',
        proposal: { type: 'DECLARE_WAR', warType: 'formal' },
      });

      const rel = next.diplomacy.relations.get('p1:p2')!;
      expect(rel.ledger).toBeDefined();
      expect(rel.ledger!.length).toBe(1);
      expect(rel.ledger![0].id).toBe('declared_war');
      expect(rel.ledger![0].value).toBe(-40);
      expect(rel.ledger![0].turnApplied).toBe(3);
    });
  });

  describe('DENOUNCE appends a ledger entry', () => {
    it('appends ledger entry with value -60 and turnExpires = turn + 30', () => {
      const state = twoPlayerState(10);
      const next = diplomacySystem(state, {
        type: 'PROPOSE_DIPLOMACY',
        targetId: 'p2',
        proposal: { type: 'DENOUNCE' },
      });

      const rel = next.diplomacy.relations.get('p1:p2')!;
      expect(rel.ledger).toBeDefined();
      expect(rel.ledger!.length).toBe(1);

      const entry = rel.ledger![0];
      expect(entry.id).toBe('denounced');
      expect(entry.value).toBe(-60);
      expect(entry.turnApplied).toBe(10);
      expect(entry.turnExpires).toBe(40); // turn 10 + 30
    });
  });

  describe('Two events on the same turn produce two distinct ledger entries', () => {
    it('denounce then formal war => two separate entries, not collapsed', () => {
      // Build state from denounce first
      const state1 = twoPlayerState(5);
      const afterDenounce = diplomacySystem(state1, {
        type: 'PROPOSE_DIPLOMACY',
        targetId: 'p2',
        proposal: { type: 'DENOUNCE' },
      });

      // Now lower relationship to allow formal war
      const rel1 = afterDenounce.diplomacy.relations.get('p1:p2')!;
      const state2 = {
        ...afterDenounce,
        diplomacy: {
          relations: new Map([['p1:p2', { ...rel1, relationship: -70, status: 'hostile' as const }]]),
        },
      };

      const afterWar = diplomacySystem(state2, {
        type: 'PROPOSE_DIPLOMACY',
        targetId: 'p2',
        proposal: { type: 'DECLARE_WAR', warType: 'formal' },
      });

      const rel = afterWar.diplomacy.relations.get('p1:p2')!;
      expect(rel.ledger).toBeDefined();
      expect(rel.ledger!.length).toBe(2);
      expect(rel.ledger![0].id).toBe('denounced');
      expect(rel.ledger![1].id).toBe('declared_war');
    });
  });

  describe('Relationship score equals sum of unexpired ledger modifiers', () => {
    it('recomputes relationship from ledger on END_TURN', () => {
      // Start with a relation that has two ledger entries: +10 and -40
      const relation: DiplomacyRelation = {
        ...defaultRelation(),
        relationship: 0,
        ledger: [
          { id: 'made_peace', value: 10, turnApplied: 1, turnExpires: 20, reason: 'Made peace' },
          { id: 'declared_war', value: -40, turnApplied: 1, reason: 'Declared war on us' },
        ],
      };
      const state = createTestState({
        turn: 5,
        players: new Map([
          ['p1', createTestPlayer({ id: 'p1' })],
          ['p2', createTestPlayer({ id: 'p2' })],
        ]),
        currentPlayerId: 'p1',
        diplomacy: { relations: new Map([['p1:p2', relation]]) },
      });

      const next = updateDiplomacyCounters(state, { type: 'END_TURN' });
      const rel = next.diplomacy.relations.get('p1:p2')!;

      // Relationship should be clamped(10 + -40) = -30
      expect(rel.relationship).toBe(-30);
    });
  });

  describe('After turnExpires passes, modifier is dropped and relationship updates', () => {
    it('expired entry is removed and remaining entries drive relationship', () => {
      // made_peace expires at turn 10; city_captured is permanent
      const relation: DiplomacyRelation = {
        ...defaultRelation(),
        relationship: -30,
        ledger: [
          { id: 'made_peace', value: 10, turnApplied: 1, turnExpires: 10, reason: 'Made peace' },
          { id: 'city_captured', value: -40, turnApplied: 1, reason: 'Captured our city' },
        ],
      };
      const state = createTestState({
        turn: 11, // past expiry of made_peace
        players: new Map([
          ['p1', createTestPlayer({ id: 'p1' })],
          ['p2', createTestPlayer({ id: 'p2' })],
        ]),
        currentPlayerId: 'p1',
        diplomacy: { relations: new Map([['p1:p2', relation]]) },
      });

      const next = updateDiplomacyCounters(state, { type: 'END_TURN' });
      const rel = next.diplomacy.relations.get('p1:p2')!;

      // made_peace (expires at 10) is dropped; only city_captured (-40) remains
      expect(rel.ledger!.length).toBe(1);
      expect(rel.ledger![0].id).toBe('city_captured');
      expect(rel.relationship).toBe(-40);
    });

    it('modifier with turnExpires undefined is never dropped', () => {
      const relation: DiplomacyRelation = {
        ...defaultRelation(),
        relationship: -40,
        ledger: [
          { id: 'declared_war', value: -40, turnApplied: 1, reason: 'Declared war on us' },
        ],
      };
      const state = createTestState({
        turn: 999,
        players: new Map([
          ['p1', createTestPlayer({ id: 'p1' })],
          ['p2', createTestPlayer({ id: 'p2' })],
        ]),
        currentPlayerId: 'p1',
        diplomacy: { relations: new Map([['p1:p2', relation]]) },
      });

      const next = updateDiplomacyCounters(state, { type: 'END_TURN' });
      const rel = next.diplomacy.relations.get('p1:p2')!;

      expect(rel.ledger!.length).toBe(1);
      expect(rel.ledger![0].id).toBe('declared_war');
      expect(rel.relationship).toBe(-40);
    });
  });

  describe('Ledger cap at 50 entries', () => {
    it('appending beyond 50 entries drops the oldest', () => {
      // Pre-fill with 50 entries
      const existingEntries = Array.from({ length: 50 }, (_, i) => ({
        id: `entry_${i}`,
        value: 1,
        turnApplied: i,
        reason: `Entry ${i}`,
      }));
      const relation: DiplomacyRelation = {
        ...defaultRelation(),
        ledger: existingEntries,
      };
      const state = stateWithRelation(relation);

      // DENOUNCE adds one more entry — should push out the first
      const next = diplomacySystem(state, {
        type: 'PROPOSE_DIPLOMACY',
        targetId: 'p2',
        proposal: { type: 'DENOUNCE' },
      });

      const rel = next.diplomacy.relations.get('p1:p2')!;
      expect(rel.ledger!.length).toBe(50);
      // The newest entry is the denouncement
      expect(rel.ledger![49].id).toBe('denounced');
      // The first entry (entry_0) was dropped
      expect(rel.ledger![0].id).toBe('entry_1');
    });
  });

  describe('ACCEPT_PEACE appends ledger entry', () => {
    it('appends made_peace entry with value +10 that expires in 20 turns', () => {
      // Set up a war, add a peace offer, then accept it
      const offer = {
        id: 'peace:p2:p1:t5',
        proposerId: 'p2' as const,
        targetId: 'p1' as const,
        proposedOnTurn: 5,
      };
      const relation: DiplomacyRelation = {
        ...defaultRelation(),
        status: 'war',
        relationship: -40,
      };
      const state = createTestState({
        turn: 6,
        players: new Map([
          ['p1', createTestPlayer({ id: 'p1', influence: 500 })],
          ['p2', createTestPlayer({ id: 'p2', influence: 500 })],
        ]),
        currentPlayerId: 'p1',
        diplomacy: {
          relations: new Map([['p1:p2', relation]]),
          pendingPeaceOffers: [offer],
        },
      });

      const next = diplomacySystem(state, { type: 'ACCEPT_PEACE', offerId: offer.id });
      const rel = next.diplomacy.relations.get('p1:p2')!;

      expect(rel.ledger).toBeDefined();
      expect(rel.ledger!.length).toBe(1);
      expect(rel.ledger![0].id).toBe('made_peace');
      expect(rel.ledger![0].value).toBe(10);
      expect(rel.ledger![0].turnApplied).toBe(6);
      expect(rel.ledger![0].turnExpires).toBe(26); // turn 6 + 20
    });
  });
});
