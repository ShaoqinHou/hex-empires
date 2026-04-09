import { describe, it, expect } from 'vitest';
import { diplomacySystem, updateDiplomacyCounters, getStatusFromRelationship, defaultRelation } from '../diplomacySystem';
import { createTestState, createTestPlayer } from './helpers';
import type { DiplomacyRelation } from '../../types/GameState';

function twoPlayerState() {
  return createTestState({
    players: new Map([
      ['p1', createTestPlayer({ id: 'p1' })],
      ['p2', createTestPlayer({ id: 'p2' })],
    ]),
    currentPlayerId: 'p1',
  });
}

/** Create a state with a pre-set relationship between p1 and p2 */
function stateWithRelation(relationOverrides: Partial<DiplomacyRelation>) {
  const relation: DiplomacyRelation = { ...defaultRelation(), ...relationOverrides };
  return createTestState({
    players: new Map([
      ['p1', createTestPlayer({ id: 'p1' })],
      ['p2', createTestPlayer({ id: 'p2' })],
    ]),
    currentPlayerId: 'p1',
    diplomacy: { relations: new Map([['p1:p2', relation]]) },
  });
}

describe('getStatusFromRelationship', () => {
  it('returns helpful for relationship > 60', () => {
    expect(getStatusFromRelationship(61)).toBe('helpful');
    expect(getStatusFromRelationship(100)).toBe('helpful');
  });

  it('returns friendly for relationship 21 to 60', () => {
    expect(getStatusFromRelationship(21)).toBe('friendly');
    expect(getStatusFromRelationship(60)).toBe('friendly');
  });

  it('returns neutral for relationship -20 to 20', () => {
    expect(getStatusFromRelationship(0)).toBe('neutral');
    expect(getStatusFromRelationship(20)).toBe('neutral');
    expect(getStatusFromRelationship(-20)).toBe('neutral');
  });

  it('returns unfriendly for relationship -60 to -21', () => {
    expect(getStatusFromRelationship(-21)).toBe('unfriendly');
    expect(getStatusFromRelationship(-60)).toBe('unfriendly');
  });

  it('returns hostile for relationship < -60', () => {
    expect(getStatusFromRelationship(-61)).toBe('hostile');
    expect(getStatusFromRelationship(-100)).toBe('hostile');
  });
});

describe('diplomacySystem', () => {
  describe('formal war', () => {
    it('allows formal war when relationship is hostile (< -60)', () => {
      const state = stateWithRelation({ relationship: -70, status: 'hostile' });
      const next = diplomacySystem(state, {
        type: 'PROPOSE_DIPLOMACY',
        targetId: 'p2',
        proposal: { type: 'DECLARE_WAR', warType: 'formal' },
      });
      const rel = next.diplomacy.relations.get('p1:p2')!;
      expect(rel.status).toBe('war');
      expect(rel.isSurpriseWar).toBe(false);
      expect(rel.warDeclarer).toBe('p1');
    });

    it('rejects formal war when relationship is not hostile enough', () => {
      const state = stateWithRelation({ relationship: -30, status: 'unfriendly' });
      const next = diplomacySystem(state, {
        type: 'PROPOSE_DIPLOMACY',
        targetId: 'p2',
        proposal: { type: 'DECLARE_WAR', warType: 'formal' },
      });
      const rel = next.diplomacy.relations.get('p1:p2')!;
      expect(rel.status).not.toBe('war'); // should be rejected
      expect(next.log.some(e => e.message.includes('Cannot declare formal war'))).toBe(true);
    });
  });

  describe('surprise war', () => {
    it('allows surprise war at any relationship', () => {
      const state = stateWithRelation({ relationship: 50, status: 'friendly' });
      const next = diplomacySystem(state, {
        type: 'PROPOSE_DIPLOMACY',
        targetId: 'p2',
        proposal: { type: 'DECLARE_WAR', warType: 'surprise' },
      });
      const rel = next.diplomacy.relations.get('p1:p2')!;
      expect(rel.status).toBe('war');
      expect(rel.isSurpriseWar).toBe(true);
    });

    it('gives defender +50 war support on surprise war', () => {
      const state = stateWithRelation({ relationship: 0, status: 'neutral' });
      const next = diplomacySystem(state, {
        type: 'PROPOSE_DIPLOMACY',
        targetId: 'p2',
        proposal: { type: 'DECLARE_WAR', warType: 'surprise' },
      });
      const rel = next.diplomacy.relations.get('p1:p2')!;
      // Negative war support = defender advantage
      expect(rel.warSupport).toBe(-50);
    });

    it('formal war does not change war support', () => {
      const state = stateWithRelation({ relationship: -70, status: 'hostile' });
      const next = diplomacySystem(state, {
        type: 'PROPOSE_DIPLOMACY',
        targetId: 'p2',
        proposal: { type: 'DECLARE_WAR', warType: 'formal' },
      });
      const rel = next.diplomacy.relations.get('p1:p2')!;
      expect(rel.warSupport).toBe(0);
    });
  });

  describe('peace', () => {
    it('makes peace when war has lasted > 5 turns and war support is low', () => {
      const state = stateWithRelation({
        status: 'war', turnsAtWar: 6, warSupport: 5, relationship: -50,
        warDeclarer: 'p1', isSurpriseWar: false,
      });
      const next = diplomacySystem(state, {
        type: 'PROPOSE_DIPLOMACY',
        targetId: 'p2',
        proposal: { type: 'PROPOSE_PEACE' },
      });
      const rel = next.diplomacy.relations.get('p1:p2')!;
      expect(rel.status).not.toBe('war');
      expect(rel.warSupport).toBe(0);
      expect(rel.warDeclarer).toBeNull();
    });

    it('rejects peace when war is too recent and war support is high', () => {
      const state = stateWithRelation({
        status: 'war', turnsAtWar: 2, warSupport: -40, relationship: -50,
        warDeclarer: 'p1', isSurpriseWar: true,
      });
      const next = diplomacySystem(state, {
        type: 'PROPOSE_DIPLOMACY',
        targetId: 'p2',
        proposal: { type: 'PROPOSE_PEACE' },
      });
      const rel = next.diplomacy.relations.get('p1:p2')!;
      expect(rel.status).toBe('war'); // still at war
    });

    it('cannot propose peace when not at war', () => {
      const state = twoPlayerState();
      const next = diplomacySystem(state, {
        type: 'PROPOSE_DIPLOMACY',
        targetId: 'p2',
        proposal: { type: 'PROPOSE_PEACE' },
      });
      // Should return state unchanged (no relation existed, default is neutral)
      expect(next).toBe(state);
    });
  });

  describe('alliance', () => {
    it('forms alliance when relationship is helpful (> 60)', () => {
      const state = stateWithRelation({ relationship: 70, status: 'helpful' });
      const next = diplomacySystem(state, {
        type: 'PROPOSE_DIPLOMACY',
        targetId: 'p2',
        proposal: { type: 'PROPOSE_ALLIANCE' },
      });
      const rel = next.diplomacy.relations.get('p1:p2')!;
      expect(rel.hasAlliance).toBe(true);
      expect(rel.hasFriendship).toBe(true);
    });

    it('rejects alliance when relationship is too low', () => {
      const state = stateWithRelation({ relationship: 40, status: 'friendly' });
      const next = diplomacySystem(state, {
        type: 'PROPOSE_DIPLOMACY',
        targetId: 'p2',
        proposal: { type: 'PROPOSE_ALLIANCE' },
      });
      const rel = next.diplomacy.relations.get('p1:p2')!;
      expect(rel.hasAlliance).toBe(false);
      expect(next.log.some(e => e.message.includes('Cannot form alliance'))).toBe(true);
    });

    it('cannot form alliance during war', () => {
      const state = stateWithRelation({ status: 'war', relationship: 70 });
      const next = diplomacySystem(state, {
        type: 'PROPOSE_DIPLOMACY',
        targetId: 'p2',
        proposal: { type: 'PROPOSE_ALLIANCE' },
      });
      // Should return unchanged (already at war guard)
      expect(next).toBe(state);
    });
  });

  describe('friendship', () => {
    it('establishes friendship when relationship is neutral or better', () => {
      const state = twoPlayerState();
      const next = diplomacySystem(state, {
        type: 'PROPOSE_DIPLOMACY',
        targetId: 'p2',
        proposal: { type: 'PROPOSE_FRIENDSHIP' },
      });
      const rel = next.diplomacy.relations.get('p1:p2')!;
      expect(rel.hasFriendship).toBe(true);
      expect(rel.relationship).toBeGreaterThan(0); // friendship improves relationship
    });

    it('rejects friendship when relationship is too negative', () => {
      const state = stateWithRelation({ relationship: -30, status: 'unfriendly' });
      const next = diplomacySystem(state, {
        type: 'PROPOSE_DIPLOMACY',
        targetId: 'p2',
        proposal: { type: 'PROPOSE_FRIENDSHIP' },
      });
      const rel = next.diplomacy.relations.get('p1:p2')!;
      expect(rel.hasFriendship).toBe(false);
    });

    it('friendship improves relationship by 20', () => {
      const state = stateWithRelation({ relationship: 10, status: 'neutral' });
      const next = diplomacySystem(state, {
        type: 'PROPOSE_DIPLOMACY',
        targetId: 'p2',
        proposal: { type: 'PROPOSE_FRIENDSHIP' },
      });
      const rel = next.diplomacy.relations.get('p1:p2')!;
      expect(rel.relationship).toBe(30);
    });
  });

  describe('denounce', () => {
    it('denounces and degrades relationship', () => {
      const state = twoPlayerState();
      const next = diplomacySystem(state, {
        type: 'PROPOSE_DIPLOMACY',
        targetId: 'p2',
        proposal: { type: 'DENOUNCE' },
      });
      const rel = next.diplomacy.relations.get('p1:p2')!;
      expect(rel.hasDenounced).toBe(true);
      expect(rel.relationship).toBe(-25);
    });

    it('denounce breaks existing alliance', () => {
      const state = stateWithRelation({ relationship: 80, status: 'helpful', hasAlliance: true, hasFriendship: true });
      const next = diplomacySystem(state, {
        type: 'PROPOSE_DIPLOMACY',
        targetId: 'p2',
        proposal: { type: 'DENOUNCE' },
      });
      const rel = next.diplomacy.relations.get('p1:p2')!;
      expect(rel.hasAlliance).toBe(false);
      expect(rel.hasFriendship).toBe(false);
      expect(rel.hasDenounced).toBe(true);
    });
  });

  describe('war breaks treaties', () => {
    it('war breaks alliance and friendship', () => {
      const state = stateWithRelation({
        relationship: -70, status: 'hostile', hasAlliance: true, hasFriendship: true,
      });
      const next = diplomacySystem(state, {
        type: 'PROPOSE_DIPLOMACY',
        targetId: 'p2',
        proposal: { type: 'DECLARE_WAR', warType: 'formal' },
      });
      const rel = next.diplomacy.relations.get('p1:p2')!;
      expect(rel.hasAlliance).toBe(false);
      expect(rel.hasFriendship).toBe(false);
    });
  });

  it('adds log entry', () => {
    const state = stateWithRelation({ relationship: -70, status: 'hostile' });
    const next = diplomacySystem(state, {
      type: 'PROPOSE_DIPLOMACY',
      targetId: 'p2',
      proposal: { type: 'DECLARE_WAR', warType: 'formal' },
    });
    expect(next.log.some(e => e.type === 'diplomacy')).toBe(true);
  });

  it('ignores non-diplomacy actions', () => {
    const state = twoPlayerState();
    expect(diplomacySystem(state, { type: 'END_TURN' })).toBe(state);
  });
});

describe('updateDiplomacyCounters', () => {
  it('increments turnsAtWar during war', () => {
    const state = stateWithRelation({ status: 'war', turnsAtWar: 3, warSupport: 0 });
    const next = updateDiplomacyCounters(state, { type: 'END_TURN' });
    const rel = next.diplomacy.relations.get('p1:p2')!;
    expect(rel.turnsAtWar).toBe(4);
  });

  it('decays war support toward 0 during war', () => {
    const state = stateWithRelation({ status: 'war', turnsAtWar: 0, warSupport: -50 });
    const next = updateDiplomacyCounters(state, { type: 'END_TURN' });
    const rel = next.diplomacy.relations.get('p1:p2')!;
    expect(rel.warSupport).toBe(-45); // decays by 5 per turn toward 0
  });

  it('decays positive war support toward 0', () => {
    const state = stateWithRelation({ status: 'war', turnsAtWar: 0, warSupport: 30 });
    const next = updateDiplomacyCounters(state, { type: 'END_TURN' });
    const rel = next.diplomacy.relations.get('p1:p2')!;
    expect(rel.warSupport).toBe(25);
  });

  it('increments turnsAtPeace during peace', () => {
    const state = stateWithRelation({ status: 'neutral', turnsAtPeace: 5, relationship: 0 });
    const next = updateDiplomacyCounters(state, { type: 'END_TURN' });
    const rel = next.diplomacy.relations.get('p1:p2')!;
    expect(rel.turnsAtPeace).toBe(6);
  });

  it('friendship improves relationship over time', () => {
    const state = stateWithRelation({
      status: 'friendly', relationship: 30, hasFriendship: true, turnsAtPeace: 0,
    });
    const next = updateDiplomacyCounters(state, { type: 'END_TURN' });
    const rel = next.diplomacy.relations.get('p1:p2')!;
    expect(rel.relationship).toBe(31);
  });

  it('denouncement degrades relationship over time', () => {
    const state = stateWithRelation({
      status: 'unfriendly', relationship: -30, hasDenounced: true, turnsAtPeace: 0,
    });
    const next = updateDiplomacyCounters(state, { type: 'END_TURN' });
    const rel = next.diplomacy.relations.get('p1:p2')!;
    expect(rel.relationship).toBe(-31);
  });

  it('updates status based on relationship changes', () => {
    const state = stateWithRelation({
      status: 'friendly', relationship: 21, hasFriendship: true, turnsAtPeace: 0,
    });
    // Over many turns, friendship should push relationship up and potentially change status
    let current = state;
    for (let i = 0; i < 40; i++) {
      current = updateDiplomacyCounters(current, { type: 'END_TURN' });
    }
    const rel = current.diplomacy.relations.get('p1:p2')!;
    expect(rel.status).toBe('helpful'); // should have improved to helpful
    expect(rel.relationship).toBeGreaterThan(60);
  });

  it('ignores non-END_TURN actions', () => {
    const state = stateWithRelation({ status: 'neutral' });
    expect(updateDiplomacyCounters(state, { type: 'START_TURN' })).toBe(state);
  });
});
