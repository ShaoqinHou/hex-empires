/**
 * JJ1.2 regression test: MAKE_PEACE / ACCEPT_PEACE clears war status.
 *
 * Covers:
 *  1. PROPOSE_PEACE creates a pending offer for human targets.
 *  2. updateDiplomacyCounters never passively resolves peace.
 *  3. Exhausted AI targets can immediately accept an explicit PROPOSE_PEACE.
 *  4. warSupport === 0 and warDeclarer === null after accepted peace.
 */

import { describe, it, expect } from 'vitest';
import { diplomacySystem, updateDiplomacyCounters } from '../diplomacySystem';
import { createTestState, createTestPlayer } from './helpers';
import type { DiplomacyRelation, PeaceOffer } from '../../types/GameState';

function getRelationKey(a: string, b: string): string {
  return [a, b].sort().join(':');
}

function makeWarRelation(turnsAtWar: number, warSupport: number): DiplomacyRelation {
  return {
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
}

function peaceOffer(): PeaceOffer {
  return {
    id: 'peace:p1:p2:t1',
    proposerId: 'p1',
    targetId: 'p2',
    proposedOnTurn: 1,
  };
}

function warState(turnsAtWar: number, warSupport: number) {
  const key = getRelationKey('p1', 'p2');
  return createTestState({
    turn: 1,
    players: new Map([
      ['p1', createTestPlayer({ id: 'p1', influence: 500 })],
      ['p2', createTestPlayer({ id: 'p2', influence: 500, isHuman: false })],
    ]),
    currentPlayerId: 'p1',
    diplomacy: {
      relations: new Map([[key, makeWarRelation(turnsAtWar, warSupport)]]),
      pendingPeaceOffers: [peaceOffer()],
    },
  });
}

describe('PROPOSE_PEACE / accepted peace (JJ1.2 regression)', () => {
  it('PROPOSE_PEACE creates a pending offer for a human target', () => {
    const key = getRelationKey('p1', 'p2');
    const state = createTestState({
      players: new Map([
        ['p1', createTestPlayer({ id: 'p1', influence: 500 })],
        ['p2', createTestPlayer({ id: 'p2', influence: 500, isHuman: true })],
      ]),
      currentPlayerId: 'p1',
      diplomacy: { relations: new Map([[key, makeWarRelation(6, -20)]]) },
    });

    const next = diplomacySystem(state, {
      type: 'PROPOSE_DIPLOMACY',
      targetId: 'p2',
      proposal: { type: 'PROPOSE_PEACE' },
    });

    const offers = next.diplomacy.pendingPeaceOffers ?? [];
    expect(offers).toHaveLength(1);
    expect(offers[0].proposerId).toBe('p1');
    expect(offers[0].targetId).toBe('p2');
    expect(next.diplomacy.relations.get(key)!.status).toBe('war');
  });

  it('does not passively resolve pending peace when turnsAtWar >= 5', () => {
    const state = warState(5, -50);
    const key = getRelationKey('p1', 'p2');

    const next = updateDiplomacyCounters(state, { type: 'END_TURN' });

    const rel = next.diplomacy.relations.get(key)!;
    expect(rel.status).toBe('war');
    expect(rel.turnsAtWar).toBe(6);
    expect(rel.warSupport).toBe(-45);
    expect(rel.warDeclarer).toBe('p1');
    expect(next.diplomacy.pendingPeaceOffers ?? []).toHaveLength(1);
  });

  it('does not passively resolve pending peace when |warSupport| <= 20', () => {
    const state = warState(2, -20);
    const key = getRelationKey('p1', 'p2');

    const next = updateDiplomacyCounters(state, { type: 'END_TURN' });

    const rel = next.diplomacy.relations.get(key)!;
    expect(rel.status).toBe('war');
    expect(rel.turnsAtWar).toBe(3);
    expect(rel.warSupport).toBe(-15);
    expect(next.diplomacy.pendingPeaceOffers ?? []).toHaveLength(1);
  });

  it('PROPOSE_PEACE to an exhausted AI target resolves immediately', () => {
    const key = getRelationKey('p1', 'p2');
    const state = createTestState({
      players: new Map([
        ['p1', createTestPlayer({ id: 'p1', influence: 500 })],
        ['p2', createTestPlayer({ id: 'p2', influence: 500, isHuman: false })],
      ]),
      currentPlayerId: 'p1',
      diplomacy: { relations: new Map([[key, makeWarRelation(6, -20)]]) },
    });

    const next = diplomacySystem(state, {
      type: 'PROPOSE_DIPLOMACY',
      targetId: 'p2',
      proposal: { type: 'PROPOSE_PEACE' },
    });

    const rel = next.diplomacy.relations.get(key)!;
    expect(rel.status).not.toBe('war');
    expect(rel.warSupport).toBe(0);
    expect(rel.warDeclarer).toBeNull();
    expect(rel.isSurpriseWar).toBe(false);
    expect(next.diplomacy.pendingPeaceOffers ?? []).toHaveLength(0);
  });

  it('ACCEPT_PEACE from target directly resolves the war', () => {
    const key = getRelationKey('p1', 'p2');
    const offer = peaceOffer();
    const state = createTestState({
      players: new Map([
        ['p1', createTestPlayer({ id: 'p1', influence: 500 })],
        ['p2', createTestPlayer({ id: 'p2', influence: 500, isHuman: false })],
      ]),
      currentPlayerId: 'p2',
      diplomacy: {
        relations: new Map([[key, makeWarRelation(6, 0)]]),
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
