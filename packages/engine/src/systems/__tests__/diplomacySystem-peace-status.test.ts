/**
 * JJ1.2 regression test: MAKE_PEACE / ACCEPT_PEACE clears war status.
 *
 * Covers:
 *  1. PROPOSE_PEACE creates a pending offer (war status unchanged immediately).
 *  2. Auto-resolution via updateDiplomacyCounters when turnsAtWar >= 5.
 *  3. Auto-resolution when |warSupport| <= 20 (even if turnsAtWar < 5).
 *  4. warSupport === 0 and warDeclarer === null after auto-resolve.
 */

import { describe, it, expect } from 'vitest';
import { diplomacySystem, updateDiplomacyCounters } from '../diplomacySystem';
import { createTestState, createTestPlayer } from './helpers';
import type { DiplomacyRelation, PeaceOffer } from '../../types/GameState';

function getRelationKey(a: string, b: string): string {
  return [a, b].sort().join(':');
}

function warState(turnsAtWar: number, warSupport: number) {
  const key = getRelationKey('p1', 'p2');
  const rel: DiplomacyRelation = {
    status: 'war',
    relationship: -40,
    turnsAtPeace: 0,
    turnsAtWar,
    warSupport,
    warDeclarer: 'p1',
    isSurpriseWar: true,
    hasAlliance: false,
    hasFriendship: false,
    hasDenounced: false,
    activeEndeavors: [],
    activeSanctions: [],
  };
  const offer: PeaceOffer = {
    id: 'peace:p1:p2:t1',
    proposerId: 'p1',
    targetId: 'p2',
    proposedOnTurn: 1,
  };
  return createTestState({
    turn: 1,
    players: new Map([
      ['p1', createTestPlayer({ id: 'p1', influence: 500 })],
      ['p2', createTestPlayer({ id: 'p2', influence: 500, isHuman: false })],
    ]),
    currentPlayerId: 'p1',
    diplomacy: {
      relations: new Map([[key, rel]]),
      pendingPeaceOffers: [offer],
    },
  });
}

describe('PROPOSE_PEACE / auto-accept peace (JJ1.2 regression)', () => {
  it('PROPOSE_PEACE creates a pending offer (war status unchanged immediately)', () => {
    const key = getRelationKey('p1', 'p2');
    const rel: DiplomacyRelation = {
      status: 'war',
      relationship: -50,
      turnsAtPeace: 0,
      turnsAtWar: 6,
      warSupport: -20,
      warDeclarer: 'p1',
      isSurpriseWar: true,
      hasAlliance: false,
      hasFriendship: false,
      hasDenounced: false,
      activeEndeavors: [],
      activeSanctions: [],
    };
    const state = createTestState({
      players: new Map([
        ['p1', createTestPlayer({ id: 'p1', influence: 500 })],
        ['p2', createTestPlayer({ id: 'p2', influence: 500, isHuman: false })],
      ]),
      currentPlayerId: 'p1',
      diplomacy: { relations: new Map([[key, rel]]) },
    });

    const next = diplomacySystem(state, {
      type: 'PROPOSE_DIPLOMACY',
      targetId: 'p2',
      proposal: { type: 'PROPOSE_PEACE' },
    });

    // Offer is created but war is not yet resolved
    const offers = next.diplomacy.pendingPeaceOffers ?? [];
    expect(offers).toHaveLength(1);
    expect(offers[0].proposerId).toBe('p1');
    expect(offers[0].targetId).toBe('p2');

    // War still active immediately after PROPOSE_PEACE
    const relation = next.diplomacy.relations.get(key)!;
    expect(relation.status).toBe('war');
  });

  it('auto-resolves pending peace offer when turnsAtWar >= 5', () => {
    // turnsAtWar = 5, warSupport = -50 (|ws| > 20 so not that condition — uses turnsAtWar)
    const state = warState(5, -50);
    const key = getRelationKey('p1', 'p2');

    const next = updateDiplomacyCounters(state, { type: 'END_TURN' });

    const rel = next.diplomacy.relations.get(key)!;
    expect(rel.status).not.toBe('war');
    expect(rel.warSupport).toBe(0);
    expect(rel.warDeclarer).toBeNull();
    // Pending offer is consumed
    expect(next.diplomacy.pendingPeaceOffers ?? []).toHaveLength(0);
  });

  it('auto-resolves pending peace offer when |warSupport| <= 20 (even if turnsAtWar < 5)', () => {
    // turnsAtWar = 2, warSupport = -20 (|ws| === 20 — boundary condition)
    const state = warState(2, -20);
    const key = getRelationKey('p1', 'p2');

    const next = updateDiplomacyCounters(state, { type: 'END_TURN' });

    const rel = next.diplomacy.relations.get(key)!;
    expect(rel.status).not.toBe('war');
    expect(rel.warSupport).toBe(0);
    expect(rel.warDeclarer).toBeNull();
    expect(next.diplomacy.pendingPeaceOffers ?? []).toHaveLength(0);
  });

  it('does NOT auto-resolve when turnsAtWar < 5 AND |warSupport| > 20', () => {
    // turnsAtWar = 3, warSupport = -50 → neither condition met
    const state = warState(3, -50);
    const key = getRelationKey('p1', 'p2');

    const next = updateDiplomacyCounters(state, { type: 'END_TURN' });

    const rel = next.diplomacy.relations.get(key)!;
    // War still active (conditions not met)
    expect(rel.status).toBe('war');
    // Offer still pending
    expect(next.diplomacy.pendingPeaceOffers ?? []).toHaveLength(1);
  });

  it('ACCEPT_PEACE from target directly resolves the war', () => {
    const key = getRelationKey('p1', 'p2');
    const rel: DiplomacyRelation = {
      status: 'war',
      relationship: -40,
      turnsAtPeace: 0,
      turnsAtWar: 6,
      warSupport: 0,
      warDeclarer: 'p1',
      isSurpriseWar: true,
      hasAlliance: false,
      hasFriendship: false,
      hasDenounced: false,
      activeEndeavors: [],
      activeSanctions: [],
    };
    const offer: PeaceOffer = {
      id: 'peace:p1:p2:t1',
      proposerId: 'p1',
      targetId: 'p2',
      proposedOnTurn: 1,
    };
    const state = createTestState({
      players: new Map([
        ['p1', createTestPlayer({ id: 'p1', influence: 500 })],
        ['p2', createTestPlayer({ id: 'p2', influence: 500, isHuman: false })],
      ]),
      // p2 is the target — ACCEPT_PEACE must be dispatched as p2
      currentPlayerId: 'p2',
      diplomacy: {
        relations: new Map([[key, rel]]),
        pendingPeaceOffers: [offer],
      },
    });

    const next = diplomacySystem(state, { type: 'ACCEPT_PEACE', offerId: offer.id });

    const relation = next.diplomacy.relations.get(key)!;
    expect(relation.status).not.toBe('war');
    expect(relation.warSupport).toBe(0);
    expect(relation.warDeclarer).toBeNull();
    expect(next.diplomacy.pendingPeaceOffers ?? []).toHaveLength(0);
  });
});
