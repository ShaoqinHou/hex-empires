import { describe, it, expect } from 'vitest';
import { diplomacySystem, updateDiplomacyCounters, getStatusFromRelationship, defaultRelation } from '../diplomacySystem';
import { createTestState, createTestPlayer } from './helpers';
import type { DiplomacyRelation } from '../../types/GameState';

function twoPlayerState() {
  return createTestState({
    players: new Map([
      // Give ample Influence so war declarations clear the §11.1 cost check.
      ['p1', createTestPlayer({ id: 'p1', influence: 500 })],
      ['p2', createTestPlayer({ id: 'p2', influence: 500 })],
    ]),
    currentPlayerId: 'p1',
  });
}

/** Create a state with a pre-set relationship between p1 and p2 */
function stateWithRelation(relationOverrides: Partial<DiplomacyRelation>) {
  const relation: DiplomacyRelation = { ...defaultRelation(), ...relationOverrides };
  return createTestState({
    players: new Map([
      ['p1', createTestPlayer({ id: 'p1', influence: 500 })],
      ['p2', createTestPlayer({ id: 'p2', influence: 500 })],
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
      // default relationship is 0; friendship adds +20 → 20
      expect(rel.relationship).toBe(20);
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

  describe('endeavor expiry on END_TURN', () => {
    it('decrements endeavor turnsRemaining each END_TURN', () => {
      const state = stateWithRelation({
        activeEndeavors: [{ type: 'trade_mission', turnsRemaining: 5, sourceId: 'p1' }],
      });
      const next = updateDiplomacyCounters(state, { type: 'END_TURN' });
      const rel = next.diplomacy.relations.get('p1:p2')!;
      expect(rel.activeEndeavors[0].turnsRemaining).toBe(4);
    });

    it('removes endeavor when turnsRemaining reaches 0', () => {
      const state = stateWithRelation({
        activeEndeavors: [{ type: 'trade_mission', turnsRemaining: 1, sourceId: 'p1' }],
      });
      const next = updateDiplomacyCounters(state, { type: 'END_TURN' });
      const rel = next.diplomacy.relations.get('p1:p2')!;
      expect(rel.activeEndeavors).toHaveLength(0);
    });

    it('keeps endeavors with turnsRemaining > 1 and removes expired ones', () => {
      const state = stateWithRelation({
        activeEndeavors: [
          { type: 'trade_mission', turnsRemaining: 3, sourceId: 'p1' },
          { type: 'cultural_exchange', turnsRemaining: 1, sourceId: 'p1' },
        ],
      });
      const next = updateDiplomacyCounters(state, { type: 'END_TURN' });
      const rel = next.diplomacy.relations.get('p1:p2')!;
      expect(rel.activeEndeavors).toHaveLength(1);
      expect(rel.activeEndeavors[0].type).toBe('trade_mission');
      expect(rel.activeEndeavors[0].turnsRemaining).toBe(2);
    });
  });

  describe('sanction expiry on END_TURN', () => {
    it('decrements sanction turnsRemaining each END_TURN', () => {
      const state = stateWithRelation({
        activeSanctions: [{ type: 'trade_ban', turnsRemaining: 7, targetId: 'p2' }],
      });
      const next = updateDiplomacyCounters(state, { type: 'END_TURN' });
      const rel = next.diplomacy.relations.get('p1:p2')!;
      expect(rel.activeSanctions[0].turnsRemaining).toBe(6);
    });

    it('removes sanction when turnsRemaining reaches 0', () => {
      const state = stateWithRelation({
        activeSanctions: [{ type: 'trade_ban', turnsRemaining: 1, targetId: 'p2' }],
      });
      const next = updateDiplomacyCounters(state, { type: 'END_TURN' });
      const rel = next.diplomacy.relations.get('p1:p2')!;
      expect(rel.activeSanctions).toHaveLength(0);
    });
  });
});

describe('PROPOSE_ENDEAVOR action', () => {
  function twoPlayerStateWithInfluence(influence: number) {
    return createTestState({
      players: new Map([
        ['p1', createTestPlayer({ id: 'p1', influence })],
        ['p2', createTestPlayer({ id: 'p2' })],
      ]),
      currentPlayerId: 'p1',
    });
  }

  it('creates a pending endeavor when player has enough influence', () => {
    const state = twoPlayerStateWithInfluence(100);
    const next = diplomacySystem(state, {
      type: 'PROPOSE_ENDEAVOR',
      targetId: 'p2',
      endeavorType: 'trade_mission',
    });
    const pending = next.diplomacy.pendingEndeavors ?? [];
    expect(pending).toHaveLength(1);
    expect(pending[0].sourceId).toBe('p1');
    expect(pending[0].targetId).toBe('p2');
    expect(pending[0].endeavorType).toBe('trade_mission');
    // No activeEndeavors yet — awaiting response
    const rel = next.diplomacy.relations.get('p1:p2');
    expect(rel?.activeEndeavors ?? []).toHaveLength(0);
  });

  it('deducts influence cost from the acting player', () => {
    const state = twoPlayerStateWithInfluence(100);
    const next = diplomacySystem(state, {
      type: 'PROPOSE_ENDEAVOR',
      targetId: 'p2',
      endeavorType: 'trade_mission',
    });
    expect(next.players.get('p1')!.influence).toBe(50); // 100 - 50 cost
  });

  it('rejects endeavor when player has insufficient influence', () => {
    const state = twoPlayerStateWithInfluence(30);
    const next = diplomacySystem(state, {
      type: 'PROPOSE_ENDEAVOR',
      targetId: 'p2',
      endeavorType: 'trade_mission',
    });
    // No pending endeavor created
    expect(next.diplomacy.pendingEndeavors ?? []).toHaveLength(0);
    // Influence unchanged
    expect(next.players.get('p1')!.influence).toBe(30);
    // Log entry explains rejection
    expect(next.log.some(e => e.message.includes('insufficient Influence'))).toBe(true);
  });

  it('adds a log entry on success', () => {
    const state = twoPlayerStateWithInfluence(100);
    const next = diplomacySystem(state, {
      type: 'PROPOSE_ENDEAVOR',
      targetId: 'p2',
      endeavorType: 'cultural_exchange',
    });
    expect(next.log.some(e => e.message.includes('Proposed') && e.message.includes('cultural_exchange') && e.message.includes('p2'))).toBe(true);
  });

  it('ignores endeavor targeting self', () => {
    const state = twoPlayerStateWithInfluence(100);
    const next = diplomacySystem(state, {
      type: 'PROPOSE_ENDEAVOR',
      targetId: 'p1',
      endeavorType: 'trade_mission',
    });
    expect(next).toBe(state);
  });
});

describe('RESPOND_ENDEAVOR action', () => {
  function stateWithPendingEndeavor() {
    return createTestState({
      players: new Map([
        ['p1', createTestPlayer({ id: 'p1', influence: 500 })],
        ['p2', createTestPlayer({ id: 'p2', influence: 500 })],
      ]),
      currentPlayerId: 'p2', // target responds
      diplomacy: {
        relations: new Map([['p1:p2', defaultRelation()]]),
        pendingEndeavors: [{
          id: 'endeavor_1',
          sourceId: 'p1',
          targetId: 'p2',
          endeavorType: 'trade_mission',
          influenceCost: 50,
        }],
      },
    });
  }

  it('accept: activates the endeavor with +5 relationship', () => {
    const state = stateWithPendingEndeavor();
    const next = diplomacySystem(state, {
      type: 'RESPOND_ENDEAVOR',
      endeavorId: 'endeavor_1',
      response: 'accept',
    });
    const rel = next.diplomacy.relations.get('p1:p2')!;
    expect(rel.activeEndeavors).toHaveLength(1);
    expect(rel.activeEndeavors[0].type).toBe('trade_mission');
    expect(rel.activeEndeavors[0].turnsRemaining).toBe(10);
    expect(rel.relationship).toBe(5); // +5 for accept
    // Pending removed
    expect(next.diplomacy.pendingEndeavors ?? []).toHaveLength(0);
  });

  it('support: activates the endeavor with +10 relationship and both players gain benefit', () => {
    const state = stateWithPendingEndeavor();
    const next = diplomacySystem(state, {
      type: 'RESPOND_ENDEAVOR',
      endeavorId: 'endeavor_1',
      response: 'support',
    });
    const rel = next.diplomacy.relations.get('p1:p2')!;
    expect(rel.activeEndeavors).toHaveLength(1);
    expect(rel.relationship).toBe(10); // +10 for support
    // Both players gain a culture bonus
    const p1Bonus = next.players.get('p1')!.legacyBonuses.find(b => b.source.startsWith('endeavor_support:'));
    const p2Bonus = next.players.get('p2')!.legacyBonuses.find(b => b.source.startsWith('endeavor_support:'));
    expect(p1Bonus).toBeDefined();
    expect(p2Bonus).toBeDefined();
    if (p1Bonus!.effect.type === 'MODIFY_YIELD') {
      expect(p1Bonus!.effect.yield).toBe('culture');
      expect(p1Bonus!.effect.value).toBe(1);
    }
    // Pending removed
    expect(next.diplomacy.pendingEndeavors ?? []).toHaveLength(0);
  });

  it('reject: removes pending endeavor with -10 relationship', () => {
    const state = stateWithPendingEndeavor();
    const next = diplomacySystem(state, {
      type: 'RESPOND_ENDEAVOR',
      endeavorId: 'endeavor_1',
      response: 'reject',
    });
    const rel = next.diplomacy.relations.get('p1:p2')!;
    expect(rel.activeEndeavors).toHaveLength(0); // no endeavor activated
    expect(rel.relationship).toBe(-10); // -10 for reject
    // Pending removed
    expect(next.diplomacy.pendingEndeavors ?? []).toHaveLength(0);
  });

  it('only the target player can respond', () => {
    const state = createTestState({
      players: new Map([
        ['p1', createTestPlayer({ id: 'p1', influence: 500 })],
        ['p2', createTestPlayer({ id: 'p2', influence: 500 })],
      ]),
      currentPlayerId: 'p1', // source tries to respond to their own proposal
      diplomacy: {
        relations: new Map([['p1:p2', defaultRelation()]]),
        pendingEndeavors: [{
          id: 'endeavor_1',
          sourceId: 'p1',
          targetId: 'p2',
          endeavorType: 'trade_mission',
          influenceCost: 50,
        }],
      },
    });
    const next = diplomacySystem(state, {
      type: 'RESPOND_ENDEAVOR',
      endeavorId: 'endeavor_1',
      response: 'accept',
    });
    // Should be unchanged — source can't respond
    expect(next).toBe(state);
  });

  it('unknown endeavor id is ignored', () => {
    const state = stateWithPendingEndeavor();
    const next = diplomacySystem(state, {
      type: 'RESPOND_ENDEAVOR',
      endeavorId: 'nonexistent',
      response: 'accept',
    });
    expect(next).toBe(state);
  });

  it('accept updates diplomatic status based on new relationship', () => {
    // Start with relationship at 19, accept adds +5 → 24 → friendly
    const relation = { ...defaultRelation(), relationship: 19 };
    const state = createTestState({
      players: new Map([
        ['p1', createTestPlayer({ id: 'p1', influence: 500 })],
        ['p2', createTestPlayer({ id: 'p2', influence: 500 })],
      ]),
      currentPlayerId: 'p2',
      diplomacy: {
        relations: new Map([['p1:p2', relation]]),
        pendingEndeavors: [{
          id: 'endeavor_1',
          sourceId: 'p1',
          targetId: 'p2',
          endeavorType: 'trade_mission',
          influenceCost: 50,
        }],
      },
    });
    const next = diplomacySystem(state, {
      type: 'RESPOND_ENDEAVOR',
      endeavorId: 'endeavor_1',
      response: 'accept',
    });
    const rel = next.diplomacy.relations.get('p1:p2')!;
    expect(rel.relationship).toBe(24);
    expect(rel.status).toBe('friendly');
  });
});

describe('DIPLOMATIC_SANCTION action', () => {
  function twoPlayerStateWithInfluence(influence: number) {
    return createTestState({
      players: new Map([
        ['p1', createTestPlayer({ id: 'p1', influence })],
        ['p2', createTestPlayer({ id: 'p2' })],
      ]),
      currentPlayerId: 'p1',
    });
  }

  it('adds a sanction to the relation when player has enough influence', () => {
    const state = twoPlayerStateWithInfluence(100);
    const next = diplomacySystem(state, {
      type: 'DIPLOMATIC_SANCTION',
      targetId: 'p2',
      sanctionType: 'trade_ban',
    });
    const rel = next.diplomacy.relations.get('p1:p2')!;
    expect(rel.activeSanctions).toHaveLength(1);
    expect(rel.activeSanctions[0].type).toBe('trade_ban');
    expect(rel.activeSanctions[0].turnsRemaining).toBe(10);
    expect(rel.activeSanctions[0].targetId).toBe('p2');
  });

  it('deducts influence cost from the acting player', () => {
    const state = twoPlayerStateWithInfluence(75);
    const next = diplomacySystem(state, {
      type: 'DIPLOMATIC_SANCTION',
      targetId: 'p2',
      sanctionType: 'trade_ban',
    });
    expect(next.players.get('p1')!.influence).toBe(25); // 75 - 50 cost
  });

  it('rejects sanction when player has insufficient influence', () => {
    const state = twoPlayerStateWithInfluence(20);
    const next = diplomacySystem(state, {
      type: 'DIPLOMATIC_SANCTION',
      targetId: 'p2',
      sanctionType: 'trade_ban',
    });
    const rel = next.diplomacy.relations.get('p1:p2');
    expect(rel?.activeSanctions ?? []).toHaveLength(0);
    expect(next.players.get('p1')!.influence).toBe(20);
    expect(next.log.some(e => e.message.includes('insufficient Influence'))).toBe(true);
  });

  it('adds a log entry on success', () => {
    const state = twoPlayerStateWithInfluence(100);
    const next = diplomacySystem(state, {
      type: 'DIPLOMATIC_SANCTION',
      targetId: 'p2',
      sanctionType: 'trade_ban',
    });
    expect(next.log.some(e => e.message.includes('trade_ban') && e.message.includes('p2'))).toBe(true);
  });

  it('ignores sanction targeting self', () => {
    const state = twoPlayerStateWithInfluence(100);
    const next = diplomacySystem(state, {
      type: 'DIPLOMATIC_SANCTION',
      targetId: 'p1',
      sanctionType: 'trade_ban',
    });
    expect(next).toBe(state);
  });
});
